import ballerina/http;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

// ---- Properties ----

function listPropertiesHandler(int 'limit, int offset) returns inline_response_200|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    int|error countResult = dbc->queryRow(`SELECT count(*) FROM properties`);
    int count = countResult is int ? countResult : 0;
    stream<Property, sql:Error?> rows = dbc->query(`SELECT id, name, address, currency FROM properties
        ORDER BY name LIMIT ${'limit} OFFSET ${offset}`);
    Property[]|error properties = from Property p in rows select p;
    if properties is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list properties", description: properties.message()}};
    }
    return {count, next: (), previous: (), data: properties};
}

function getPropertyHandler(string propertyId) returns Property|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    Property|sql:Error result = dbc->queryRow(`SELECT id, name, address, currency FROM properties WHERE id = ${propertyId}`);
    if result is sql:NoRowsError {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    if result is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    return result;
}

function createPropertyHandler(Property payload) returns Property|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    if payload.name.trim() == "" || payload.currency.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "name and currency are required"}};
    }
    string id = payload.id.trim() == "" ? uuid:createRandomUuid() : payload.id;
    Property created = {id, name: payload.name, address: payload?.address, currency: payload.currency};
    sql:ExecutionResult|sql:Error result = dbc->execute(`INSERT INTO properties (id, name, address, currency)
        VALUES (${id}, ${created.name}, ${created?.address}, ${created.currency})`);
    if result is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to create property", description: result.message()}};
    }
    return created;
}

function updatePropertyHandler(string propertyId, Property payload) returns Property|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE properties
        SET name = ${payload.name}, address = ${payload?.address}, currency = ${payload.currency}
        WHERE id = ${propertyId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    return {id: propertyId, name: payload.name, address: payload?.address, currency: payload.currency};
}

function deletePropertyHandler(string propertyId) returns http:NoContent|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`DELETE FROM properties WHERE id = ${propertyId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "property not found"}};
    }
    return http:NO_CONTENT;
}

// ---- Room types ----

function listRoomTypesHandler(string propertyId, string? checkIn, string? checkOut, int? guests, int 'limit, int offset)
        returns inline_response_200_1|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    sql:ParameterizedQuery countQuery = `SELECT count(*) FROM room_types WHERE property_id = ${propertyId}`;
    sql:ParameterizedQuery query = `SELECT id, property_id AS "propertyId", name, occupancy, base_rate AS "baseRate"
        FROM room_types WHERE property_id = ${propertyId}`;
    if guests is int {
        countQuery = sql:queryConcat(countQuery, ` AND occupancy >= ${guests}`);
        query = sql:queryConcat(query, ` AND occupancy >= ${guests}`);
    }
    int|error countResult = dbc->queryRow(countQuery);
    int count = countResult is int ? countResult : 0;
    query = sql:queryConcat(query, ` ORDER BY name LIMIT ${'limit} OFFSET ${offset}`);
    stream<RoomType, sql:Error?> rows = dbc->query(query);
    RoomType[]|error roomTypes = from RoomType r in rows select r;
    if roomTypes is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list room types", description: roomTypes.message()}};
    }
    // checkIn/checkOut narrow to room types with at least one room free every
    // night of the stay — the same availability check a booking performs, so
    // guest search never shows a room the booking call would then refuse.
    if checkIn is string && checkOut is string {
        RoomType[] available = [];
        foreach RoomType r in roomTypes {
            boolean|error fits = hasAvailabilityForRange(dbc, r.id, checkIn, checkOut);
            if fits is boolean && fits {
                available.push(r);
            }
        }
        return {count: available.length(), next: (), previous: (), data: available};
    }
    return {count, next: (), previous: (), data: roomTypes};
}

function hasAvailabilityForRange(postgresql:Client dbc, string roomTypeId, string checkIn, string checkOut)
        returns boolean|error {
    string[] nights = check nightsBetween(checkIn, checkOut);
    if nights.length() == 0 {
        return false;
    }
    foreach string night in nights {
        int|sql:Error rooms = dbc->queryRow(`SELECT rooms_available FROM availability_days
            WHERE room_type_id = ${roomTypeId} AND day = ${night}`);
        if rooms is sql:Error || rooms < 1 {
            return false;
        }
    }
    return true;
}

function createRoomTypeHandler(string propertyId, RoomType payload) returns RoomType|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    if payload.name.trim() == "" || payload.occupancy < 1 {
        return <ErrorBadRequest>{body: {code: 400, message: "name and a positive occupancy are required"}};
    }
    string id = payload.id.trim() == "" ? uuid:createRandomUuid() : payload.id;
    sql:ExecutionResult|sql:Error result = dbc->execute(`INSERT INTO room_types (id, property_id, name, occupancy, base_rate)
        VALUES (${id}, ${propertyId}, ${payload.name}, ${payload.occupancy}, ${payload.baseRate})`);
    if result is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to create room type", description: result.message()}};
    }
    return {id, propertyId, name: payload.name, occupancy: payload.occupancy, baseRate: payload.baseRate};
}

function updateRoomTypeHandler(string roomTypeId, RoomType payload) returns RoomType|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "room type not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE room_types
        SET name = ${payload.name}, occupancy = ${payload.occupancy}, base_rate = ${payload.baseRate}
        WHERE id = ${roomTypeId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "room type not found"}};
    }
    RoomType|sql:Error row = dbc->queryRow(`SELECT id, property_id AS "propertyId", name, occupancy, base_rate AS "baseRate"
        FROM room_types WHERE id = ${roomTypeId}`);
    if row is sql:Error {
        return <ErrorNotFound>{body: {code: 404, message: "room type not found"}};
    }
    pushRoomTypeToChannels(dbc, roomTypeId);
    return row;
}

function deleteRoomTypeHandler(string roomTypeId) returns http:NoContent|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "room type not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`DELETE FROM room_types WHERE id = ${roomTypeId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "room type not found"}};
    }
    return http:NO_CONTENT;
}

// ---- Rate plans ----

function listRatePlansHandler(string roomTypeId) returns inline_response_200_2|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    stream<RatePlan, sql:Error?> rows = dbc->query(`SELECT id, room_type_id AS "roomTypeId",
        start_date AS "startDate", end_date AS "endDate", rate
        FROM rate_plans WHERE room_type_id = ${roomTypeId} ORDER BY start_date`);
    RatePlan[]|error ratePlans = from RatePlan r in rows select r;
    if ratePlans is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list rate plans", description: ratePlans.message()}};
    }
    return {count: ratePlans.length(), next: (), previous: (), data: ratePlans};
}

function createRatePlanHandler(string roomTypeId, RatePlan payload) returns RatePlan|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    if payload.startDate.trim() == "" || payload.endDate.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "startDate and endDate are required"}};
    }
    string id = payload.id.trim() == "" ? uuid:createRandomUuid() : payload.id;
    sql:ExecutionResult|sql:Error result = dbc->execute(`INSERT INTO rate_plans (id, room_type_id, start_date, end_date, rate)
        VALUES (${id}, ${roomTypeId}, ${payload.startDate}, ${payload.endDate}, ${payload.rate})`);
    if result is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to create rate plan", description: result.message()}};
    }
    pushRoomTypeToChannels(dbc, roomTypeId);
    return {id, roomTypeId, startDate: payload.startDate, endDate: payload.endDate, rate: payload.rate};
}

# The rate in effect for a room type on a given night: the most recently
# created rate plan covering it, falling back to the room type's base rate.
function currentRate(postgresql:Client dbc, string roomTypeId, string date) returns decimal {
    decimal|sql:Error rate = dbc->queryRow(`SELECT rate FROM rate_plans
        WHERE room_type_id = ${roomTypeId} AND start_date <= ${date} AND end_date >= ${date}
        ORDER BY start_date DESC LIMIT 1`);
    if rate is decimal {
        return rate;
    }
    decimal|sql:Error baseRate = dbc->queryRow(`SELECT base_rate FROM room_types WHERE id = ${roomTypeId}`);
    return baseRate is decimal ? baseRate : 0d;
}
