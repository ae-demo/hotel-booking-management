import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

function toApiReservation(ReservationRow row) returns Reservation => {
    id: row.id,
    propertyId: row.propertyId,
    roomTypeId: row.roomTypeId,
    guestId: row.guestId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    status: <"pending"|"confirmed"|"checked-in"|"checked-out"|"cancelled">(row.status),
    'source: <"direct"|"front-desk"|"channel">(row.'source),
    channelName: row.channelName
};

function fetchReservation(postgresql:Client dbc, string reservationId) returns ReservationRow|sql:Error {
    return dbc->queryRow(`SELECT id, property_id AS "propertyId", room_type_id AS "roomTypeId",
        guest_id AS "guestId", check_in AS "checkIn", check_out AS "checkOut", status,
        source AS "source", channel_name AS "channelName", channel_connection_id AS "channelConnectionId",
        owner_sub AS "ownerSub", amount, created_at AS "createdAt"
        FROM reservations WHERE id = ${reservationId}`);
}

function insertGuest(postgresql:Client dbc, GuestInput input) returns string|sql:Error {
    string id = uuid:createRandomUuid();
    _ = check dbc->execute(`INSERT INTO guests (id, name, email, phone, whatsapp_opt_in, owner_sub)
        VALUES (${id}, ${input.name}, ${input.email}, ${input.phone}, ${input.whatsappOptIn}, ${input.ownerSub})`);
    return id;
}

function insertReservation(postgresql:Client dbc, string id, string propertyId, string roomTypeId, string? guestId,
        string checkIn, string checkOut, string status, string 'source, string? ownerSub, decimal? amount)
        returns sql:Error? {
    _ = check dbc->execute(`INSERT INTO reservations
        (id, property_id, room_type_id, guest_id, check_in, check_out, status, source,
         channel_name, channel_connection_id, owner_sub, amount, created_at)
        VALUES (${id}, ${propertyId}, ${roomTypeId}, ${guestId}, ${checkIn}, ${checkOut}, ${status}, ${'source},
                NULL, NULL, ${ownerSub}, ${amount}, ${nowStamp()})`);
}

function validateStayDates(string checkIn, string checkOut) returns string[]|error {
    string[]|error nights = nightsBetween(checkIn, checkOut);
    if nights is error {
        return nights;
    }
    if nights.length() == 0 {
        return error("checkOut must be after checkIn");
    }
    return nights;
}

// ---- Guest self-service: /me/reservations ----

function listMyReservationsHandler(string callerSub, int 'limit, int offset)
        returns inline_response_200_3|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    stream<ReservationRow, sql:Error?> rows = dbc->query(`SELECT id, property_id AS "propertyId",
        room_type_id AS "roomTypeId", guest_id AS "guestId", check_in AS "checkIn", check_out AS "checkOut",
        status, source AS "source", channel_name AS "channelName", channel_connection_id AS "channelConnectionId",
        owner_sub AS "ownerSub", amount, created_at AS "createdAt"
        FROM reservations WHERE owner_sub = ${callerSub}
        ORDER BY created_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    ReservationRow[]|error reservationRows = from ReservationRow r in rows select r;
    if reservationRows is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list reservations", description: reservationRows.message()}};
    }
    Reservation[] reservations = from ReservationRow r in reservationRows select toApiReservation(r);
    return {count: reservations.length(), next: (), previous: (), data: reservations};
}

function createMyReservationHandler(string callerSub, ReservationCreate payload)
        returns Reservation|ErrorBadRequest|ErrorPaymentRequired|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    string[]|error nights = validateStayDates(payload.checkIn, payload.checkOut);
    if nights is error {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid stay dates", description: nights.message()}};
    }
    Property|sql:Error property = dbc->queryRow(`SELECT id, name, address, currency FROM properties
        WHERE id = ${payload.propertyId}`);
    if property is sql:Error {
        return <ErrorBadRequest>{body: {code: 400, message: "unknown propertyId"}};
    }
    boolean|error held = reserveNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
    if held is error {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid stay dates", description: held.message()}};
    }
    if !held {
        return <ErrorBadRequest>{body: {code: 400, message: "room unavailable for the requested dates"}};
    }

    decimal amount = 0d;
    foreach string night in nights {
        amount += currentRate(dbc, payload.roomTypeId, night);
    }
    string reservationId = uuid:createRandomUuid();
    string returnUrl = "https://guest.hotel-booking.local/reservations/confirm";
    PaymentOutcome outcome = chargeForBooking(reservationId, amount, property.currency, returnUrl);
    if !outcome.approved {
        error? released = releaseNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
        if released is error {
            log:printError("failed to release held nights after declined payment", 'error = released);
        }
        return <ErrorPaymentRequired>{body: {code: 402, message: "payment declined", description: outcome.reason}};
    }

    GuestInput guestInput = {
        name: payload?.guestName,
        email: payload?.guestEmail,
        phone: payload?.guestPhone,
        whatsappOptIn: payload?.whatsappOptIn ?: false,
        ownerSub: callerSub
    };
    string|sql:Error guestId = insertGuest(dbc, guestInput);
    string? guestIdValue = guestId is string ? guestId : ();

    sql:Error? inserted = insertReservation(dbc, reservationId, payload.propertyId, payload.roomTypeId, guestIdValue,
        payload.checkIn, payload.checkOut, "confirmed", "direct", callerSub, amount);
    if inserted is sql:Error {
        error? released = releaseNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
        if released is error {
            log:printError("failed to release held nights after a failed insert", 'error = released);
        }
        return <http:InternalServerError>{body: {code: 500, message: "failed to record reservation", description: inserted.message()}};
    }

    string? guestEmail = payload?.guestEmail;
    if guestEmail is string {
        sendBookingEmail(guestEmail, payload?.guestName ?: "Guest",
            "Your booking is confirmed",
            string `Your reservation ${reservationId} from ${payload.checkIn} to ${payload.checkOut} is confirmed.`);
    }
    sendBookingWhatsapp(payload?.whatsappOptIn ?: false, payload?.guestPhone,
        string `Your reservation ${reservationId} from ${payload.checkIn} to ${payload.checkOut} is confirmed.`);
    pushRoomTypeToChannels(dbc, payload.roomTypeId);

    return {
        id: reservationId,
        propertyId: payload.propertyId,
        roomTypeId: payload.roomTypeId,
        guestId: guestIdValue,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        status: "confirmed",
        'source: "direct",
        channelName: ()
    };
}

function cancelMyReservationHandler(string callerSub, string reservationId) returns ReservationOk|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error row = fetchReservation(dbc, reservationId);
    if row is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    string? owner = row.ownerSub;
    if owner is () || owner != callerSub {
        // Not the caller's reservation — a caller who may not see it may not
        // learn it exists either, so this is the same 404 as a missing row.
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    return performCancellation(dbc, row);
}

// ---- Staff-facing: /reservations ----

function listReservationsHandler(string? propertyId, string? status, int 'limit, int offset)
        returns inline_response_200_3|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    sql:ParameterizedQuery query = `SELECT id, property_id AS "propertyId", room_type_id AS "roomTypeId",
        guest_id AS "guestId", check_in AS "checkIn", check_out AS "checkOut", status,
        source AS "source", channel_name AS "channelName", channel_connection_id AS "channelConnectionId",
        owner_sub AS "ownerSub", amount, created_at AS "createdAt"
        FROM reservations WHERE 1 = 1`;
    if propertyId is string {
        query = sql:queryConcat(query, ` AND property_id = ${propertyId}`);
    }
    if status is string {
        query = sql:queryConcat(query, ` AND status = ${status}`);
    }
    query = sql:queryConcat(query, ` ORDER BY created_at DESC LIMIT ${'limit} OFFSET ${offset}`);
    stream<ReservationRow, sql:Error?> rows = dbc->query(query);
    ReservationRow[]|error reservationRows = from ReservationRow r in rows select r;
    if reservationRows is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list reservations", description: reservationRows.message()}};
    }
    Reservation[] reservations = from ReservationRow r in reservationRows select toApiReservation(r);
    return {count: reservations.length(), next: (), previous: (), data: reservations};
}

function getReservationHandler(string reservationId) returns Reservation|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error row = fetchReservation(dbc, reservationId);
    if row is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    return toApiReservation(row);
}

function createWalkInReservationHandler(ReservationCreate payload) returns Reservation|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    string[]|error nights = validateStayDates(payload.checkIn, payload.checkOut);
    if nights is error {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid stay dates", description: nights.message()}};
    }
    boolean|error held = reserveNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
    if held is error {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid stay dates", description: held.message()}};
    }
    if !held {
        return <ErrorBadRequest>{body: {code: 400, message: "room unavailable for the requested dates"}};
    }
    decimal amount = 0d;
    foreach string night in nights {
        amount += currentRate(dbc, payload.roomTypeId, night);
    }
    GuestInput guestInput = {
        name: payload?.guestName,
        email: payload?.guestEmail,
        phone: payload?.guestPhone,
        whatsappOptIn: payload?.whatsappOptIn ?: false,
        ownerSub: ()
    };
    string|sql:Error guestId = insertGuest(dbc, guestInput);
    string? guestIdValue = guestId is string ? guestId : ();
    string reservationId = uuid:createRandomUuid();
    sql:Error? inserted = insertReservation(dbc, reservationId, payload.propertyId, payload.roomTypeId, guestIdValue,
        payload.checkIn, payload.checkOut, "confirmed", "front-desk", (), amount);
    if inserted is sql:Error {
        error? released = releaseNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
        if released is error {
            log:printError("failed to release held nights after a failed insert", 'error = released);
        }
        return <http:InternalServerError>{body: {code: 500, message: "failed to record reservation", description: inserted.message()}};
    }
    pushRoomTypeToChannels(dbc, payload.roomTypeId);
    return {
        id: reservationId,
        propertyId: payload.propertyId,
        roomTypeId: payload.roomTypeId,
        guestId: guestIdValue,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        status: "confirmed",
        'source: "front-desk",
        channelName: ()
    };
}

function updateReservationHandler(string reservationId, ReservationCreate payload) returns Reservation|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error existing = fetchReservation(dbc, reservationId);
    if existing is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    // Dates or room type changed: swap the availability hold for the new
    // range, refusing the change (keeping the reservation as it was) rather
    // than leaving it double-booked or holding nothing at all.
    boolean datesChanged = existing.roomTypeId != payload.roomTypeId
        || existing.checkIn != payload.checkIn || existing.checkOut != payload.checkOut;
    if datesChanged && existing.status != "cancelled" && existing.status != "checked-out" {
        error? release = releaseNights(dbc, existing.roomTypeId, existing.checkIn, existing.checkOut);
        if release is error {
            return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
        }
        boolean|error held = reserveNights(dbc, payload.roomTypeId, payload.checkIn, payload.checkOut);
        boolean heldOk = held is boolean && held;
        if !heldOk {
            // Put the original hold back and leave the reservation unchanged.
            boolean|error restore = reserveNights(dbc, existing.roomTypeId, existing.checkIn, existing.checkOut);
            if restore is error {
                log:printError("failed to restore original availability hold on a refused update", 'error = restore);
            }
            return toApiReservation(existing);
        }
        pushRoomTypeToChannels(dbc, existing.roomTypeId);
        pushRoomTypeToChannels(dbc, payload.roomTypeId);
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE reservations
        SET property_id = ${payload.propertyId}, room_type_id = ${payload.roomTypeId},
            check_in = ${payload.checkIn}, check_out = ${payload.checkOut}
        WHERE id = ${reservationId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error updated = fetchReservation(dbc, reservationId);
    if updated is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    return toApiReservation(updated);
}

function cancelReservationHandler(string reservationId) returns ReservationOk|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error row = fetchReservation(dbc, reservationId);
    if row is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    return performCancellation(dbc, row);
}

function performCancellation(postgresql:Client dbc, ReservationRow row) returns ReservationOk|ErrorNotFound {
    if row.status == "cancelled" || row.status == "checked-out" {
        return <ReservationOk>{body: toApiReservation(row)};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE reservations SET status = 'cancelled' WHERE id = ${row.id}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    error? released = releaseNights(dbc, row.roomTypeId, row.checkIn, row.checkOut);
    if released is error {
        log:printError("failed to release nights on cancellation", 'error = released, reservationId = row.id);
    }
    pushRoomTypeToChannels(dbc, row.roomTypeId);
    string? guestId = row.guestId;
    if guestId is string {
        GuestContact|sql:Error guest = dbc->queryRow(`SELECT email, phone, whatsapp_opt_in AS "whatsappOptIn", name
                FROM guests WHERE id = ${guestId}`);
        if guest is GuestContact {
            string? guestEmail = guest.email;
            if guestEmail is string {
                sendBookingEmail(guestEmail, guest.name ?: "Guest", "Your booking was cancelled",
                    string `Your reservation ${row.id} has been cancelled.`);
            }
            sendBookingWhatsapp(guest.whatsappOptIn, guest.phone,
                string `Your reservation ${row.id} has been cancelled.`);
        }
    }
    ReservationRow updated = row;
    updated.status = "cancelled";
    return <ReservationOk>{body: toApiReservation(updated)};
}

function checkInReservationHandler(string reservationId) returns ReservationOk|ErrorNotFound {
    return transitionReservation(reservationId, "checked-in");
}

function checkOutReservationHandler(string reservationId) returns ReservationOk|ErrorNotFound {
    return transitionReservation(reservationId, "checked-out");
}

function transitionReservation(string reservationId, string newStatus) returns ReservationOk|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE reservations SET status = ${newStatus} WHERE id = ${reservationId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    ReservationRow|sql:Error updated = fetchReservation(dbc, reservationId);
    if updated is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "reservation not found"}};
    }
    return <ReservationOk>{body: toApiReservation(updated)};
}
