import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;
import hotel_api.otachannelservice;

// ota-channel-service (Booking.com Connectivity API, external). One
// credential set (BOOKING_HOTEL_ID/BOOKING_API_USERNAME/BOOKING_API_PASSWORD)
// stands in for "the channel manager" this design's channel_connections point
// at; every push/pull attempt is logged as a sync_event and the connection's
// `status` always reflects the most recent one, whether or not credentials
// are present.

function otaClient() returns otachannelservice:Client|error {
    if bookingApiUsername.trim() == "" || bookingApiPassword.trim() == "" {
        return error("ota-channel-service credentials not configured");
    }
    otachannelservice:ConnectionConfig connConfig = {auth: {username: bookingApiUsername, password: bookingApiPassword}};
    return new (connConfig);
}

function recordSyncEvent(postgresql:Client dbc, string channelConnectionId, string direction, string outcome) {
    string id = uuid:createRandomUuid();
    sql:ExecutionResult|sql:Error result = dbc->execute(`INSERT INTO sync_events (id, channel_connection_id, direction, outcome, occurred_at)
        VALUES (${id}, ${channelConnectionId}, ${direction}, ${outcome}, ${nowStamp()})`);
    if result is sql:Error {
        log:printError("failed to record sync event", 'error = result, channelConnectionId = channelConnectionId);
    }
    string newStatus = outcome == "success" ? "connected" : "error";
    sql:ExecutionResult|sql:Error updateResult = dbc->execute(`UPDATE channel_connections
        SET status = ${newStatus}, last_synced_at = ${nowStamp()} WHERE id = ${channelConnectionId}`);
    if updateResult is sql:Error {
        log:printError("failed to update channel connection status", 'error = updateResult);
    }
}

# Pushes every currently-known availability day (and its effective rate) for a
# room type out to every connected channel of its property — story 7, run
# after any room-inventory update: a new/updated room type, a new rate plan,
# a manual availability edit, or a change availability_days made as the side
# effect of a booking or cancellation. Best-effort: logs and records a failed
# sync event rather than surfacing anything to the caller who triggered it.
function pushRoomTypeToChannels(postgresql:Client dbc, string roomTypeId) {
    string|sql:Error propertyId = dbc->queryRow(`SELECT property_id FROM room_types WHERE id = ${roomTypeId}`);
    if propertyId is sql:Error {
        return;
    }
    stream<ChannelConnection, sql:Error?> connections = dbc->query(`
        SELECT id, property_id AS "propertyId", channel_name AS "channelName", status,
               last_synced_at AS "lastSyncedAt"
        FROM channel_connections WHERE property_id = ${propertyId}`);
    ChannelConnection[]|error connectionList = from ChannelConnection c in connections select c;
    if connectionList is error || connectionList.length() == 0 {
        return;
    }
    AvailabilityDay[]|error days = getAvailabilityCalendar(dbc, roomTypeId, (), ());
    if days is error {
        return;
    }
    foreach ChannelConnection connection in connectionList {
        pushToOneChannel(dbc, connection.id, roomTypeId, days);
    }
}

function pushToOneChannel(postgresql:Client dbc, string channelConnectionId, string roomTypeId, AvailabilityDay[] days) {
    otachannelservice:Client|error ota = otaClient();
    if ota is error {
        log:printWarn("ota-channel-service not configured; recording failed push", channelConnectionId = channelConnectionId);
        recordSyncEvent(dbc, channelConnectionId, "push", "failed");
        return;
    }
    boolean allOk = true;
    foreach AvailabilityDay day in days {
        decimal rate = currentRate(dbc, roomTypeId, day.date);
        otachannelservice:RateAvailabilityUpdate update = {
            hotelId: bookingHotelId,
            roomTypeId,
            date: day.date,
            roomsAvailable: day.roomsAvailable,
            rate
        };
        error? result = ota->/rates\-availability.put(update);
        if result is error {
            allOk = false;
        }
    }
    recordSyncEvent(dbc, channelConnectionId, "push", allOk ? "success" : "failed");
}

// ---- Channel connections ----

function listChannelConnectionsHandler(string? propertyId, int 'limit, int offset)
        returns inline_response_200_5|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    sql:ParameterizedQuery query = `SELECT id, property_id AS "propertyId", channel_name AS "channelName",
        status, last_synced_at AS "lastSyncedAt" FROM channel_connections`;
    if propertyId is string {
        query = sql:queryConcat(query, ` WHERE property_id = ${propertyId}`);
    }
    query = sql:queryConcat(query, ` ORDER BY channel_name LIMIT ${'limit} OFFSET ${offset}`);
    stream<ChannelConnection, sql:Error?> rows = dbc->query(query);
    ChannelConnection[]|error connections = from ChannelConnection c in rows select c;
    if connections is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list channel connections", description: connections.message()}};
    }
    return {count: connections.length(), next: (), previous: (), data: connections};
}

function connectChannelHandler(ChannelConnection payload) returns ChannelConnection|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    if payload.propertyId.trim() == "" || payload.channelName.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "propertyId and channelName are required"}};
    }
    string id = payload.id.trim() == "" ? uuid:createRandomUuid() : payload.id;
    sql:ExecutionResult|sql:Error insertResult = dbc->execute(`INSERT INTO channel_connections (id, property_id, channel_name, status, last_synced_at)
        VALUES (${id}, ${payload.propertyId}, ${payload.channelName}, 'connected', NULL)`);
    if insertResult is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to create channel connection", description: insertResult.message()}};
    }
    otachannelservice:Client|error ota = otaClient();
    if ota is error {
        recordSyncEvent(dbc, id, "push", "failed");
    } else {
        otachannelservice:ChannelConnectionStatus|error status = ota->/connections.post({hotelId: bookingHotelId});
        recordSyncEvent(dbc, id, "push", status is error ? "failed" : "success");
    }
    ChannelConnection|sql:Error row = dbc->queryRow(`SELECT id, property_id AS "propertyId",
        channel_name AS "channelName", status, last_synced_at AS "lastSyncedAt"
        FROM channel_connections WHERE id = ${id}`);
    if row is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "channel connection vanished after insert"}};
    }
    return row;
}

function updateChannelConnectionHandler(string channelConnectionId, ChannelConnection payload)
        returns ChannelConnection|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "channel connection not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE channel_connections
        SET channel_name = ${payload.channelName}, status = ${payload.status}
        WHERE id = ${channelConnectionId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "channel connection not found"}};
    }
    ChannelConnection|sql:Error row = dbc->queryRow(`SELECT id, property_id AS "propertyId",
        channel_name AS "channelName", status, last_synced_at AS "lastSyncedAt"
        FROM channel_connections WHERE id = ${channelConnectionId}`);
    if row is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "channel connection not found"}};
    }
    return row;
}

function disconnectChannelHandler(string channelConnectionId) returns http:NoContent|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "channel connection not found"}};
    }
    otachannelservice:Client|error ota = otaClient();
    if ota is otachannelservice:Client {
        error? deleteResult = ota->/connections/[bookingHotelId].delete();
        if deleteResult is error {
            log:printWarn("ota-channel-service disconnect failed", 'error = deleteResult);
        }
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`DELETE FROM channel_connections WHERE id = ${channelConnectionId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "channel connection not found"}};
    }
    return http:NO_CONTENT;
}

function listSyncEventsHandler(string channelConnectionId, int 'limit, int offset)
        returns inline_response_200_6|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    stream<SyncEvent, sql:Error?> rows = dbc->query(`SELECT id, channel_connection_id AS "channelConnectionId",
        direction, outcome, occurred_at AS "occurredAt"
        FROM sync_events WHERE channel_connection_id = ${channelConnectionId}
        ORDER BY occurred_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    SyncEvent[]|error events = from SyncEvent e in rows select e;
    if events is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list sync events", description: events.message()}};
    }
    return {count: events.length(), next: (), previous: (), data: events};
}

// ---- Receiving a channel booking (pull) ----

function receiveChannelBookingHandler(ChannelBookingNotification payload) returns Reservation|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    ChannelConnection|sql:Error connection = dbc->queryRow(`SELECT id, property_id AS "propertyId",
        channel_name AS "channelName", status, last_synced_at AS "lastSyncedAt"
        FROM channel_connections WHERE id = ${payload.channelConnectionId}`);
    if connection is sql:Error {
        return <ErrorBadRequest>{body: {code: 400, message: "unknown channelConnectionId"}};
    }
    RoomType|sql:Error roomType = dbc->queryRow(`SELECT id, property_id AS "propertyId", name, occupancy,
        base_rate AS "baseRate" FROM room_types WHERE id = ${payload.roomTypeId}`);
    if roomType is sql:Error {
        return <ErrorBadRequest>{body: {code: 400, message: "unknown roomTypeId"}};
    }
    string[]|error nights = nightsBetween(payload.checkIn, payload.checkOut);
    if nights is error || nights.length() == 0 {
        return <ErrorBadRequest>{body: {code: 400, message: "checkOut must be after checkIn"}};
    }
    // A channel booking has already been sold at the OTA — this call records
    // it and reduces inventory everywhere, it never refuses the guest a room
    // this system's own local calendar has fallen behind on.
    error? forced = forceReserveNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
    if forced is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to update availability", description: forced.message()}};
    }
    string guestId = uuid:createRandomUuid();
    sql:ExecutionResult|sql:Error guestInsert = dbc->execute(`INSERT INTO guests (id, name, email, phone, whatsapp_opt_in, owner_sub)
        VALUES (${guestId}, ${payload.guestName}, ${payload?.guestEmail}, NULL, FALSE, NULL)`);
    if guestInsert is sql:Error {
        log:printError("failed to record channel guest", 'error = guestInsert);
    }
    string reservationId = uuid:createRandomUuid();
    Reservation reservation = {
        id: reservationId,
        propertyId: roomType.propertyId,
        roomTypeId: payload.roomTypeId,
        guestId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        status: "confirmed",
        'source: "channel",
        channelName: connection.channelName
    };
    sql:ExecutionResult|sql:Error reservationInsert = dbc->execute(`INSERT INTO reservations
        (id, property_id, room_type_id, guest_id, check_in, check_out, status, source, channel_name,
         channel_connection_id, owner_sub, amount, created_at)
        VALUES (${reservationId}, ${roomType.propertyId}, ${payload.roomTypeId}, ${guestId}, ${payload.checkIn},
                ${payload.checkOut}, 'confirmed', 'channel', ${connection.channelName}, ${payload.channelConnectionId},
                NULL, NULL, ${nowStamp()})`);
    if reservationInsert is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to record channel reservation", description: reservationInsert.message()}};
    }
    recordSyncEvent(dbc, payload.channelConnectionId, "pull", "success");
    pushRoomTypeToChannels(dbc, payload.roomTypeId);
    return reservation;
}

# Like `reserveNights`, but never refuses: a night with no configured row or
# with zero rooms left is clamped at zero rather than blocking. Only used for
# a channel booking, which the OTA has already sold — refusing it here would
# not un-sell it, only hide that it happened from this system's own inventory.
function forceReserveNights(postgresql:Client dbc, string roomTypeId, string checkIn, string checkOut) returns error? {
    string[] nights = check nightsBetween(checkIn, checkOut);
    foreach string night in nights {
        sql:ExecutionResult|sql:Error updateResult = dbc->execute(`
            UPDATE availability_days SET rooms_available = GREATEST(rooms_available - 1, 0)
            WHERE room_type_id = ${roomTypeId} AND day = ${night}`);
        if updateResult is sql:ExecutionResult && updateResult.affectedRowCount == 0 {
            _ = check dbc->execute(`INSERT INTO availability_days (room_type_id, day, rooms_available)
                VALUES (${roomTypeId}, ${night}, 0)
                ON CONFLICT (room_type_id, day) DO UPDATE SET rooms_available = GREATEST(availability_days.rooms_available - 1, 0)`);
        }
    }
}
