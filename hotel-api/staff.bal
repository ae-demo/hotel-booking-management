import ballerina/http;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

function listStaffAccountsHandler(int 'limit, int offset) returns inline_response_200_4|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    stream<StaffAccount, sql:Error?> rows = dbc->query(`SELECT id, property_id AS "propertyId", name, email, role
        FROM staff_accounts ORDER BY name LIMIT ${'limit} OFFSET ${offset}`);
    StaffAccount[]|error staff = from StaffAccount s in rows select s;
    if staff is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to list staff accounts", description: staff.message()}};
    }
    return {count: staff.length(), next: (), previous: (), data: staff};
}

function inviteStaffAccountHandler(StaffAccount payload) returns StaffAccount|ErrorBadRequest|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    if payload.name.trim() == "" || payload.email.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "name and email are required"}};
    }
    string id = payload.id.trim() == "" ? uuid:createRandomUuid() : payload.id;
    sql:ExecutionResult|sql:Error result = dbc->execute(`INSERT INTO staff_accounts (id, property_id, name, email, role)
        VALUES (${id}, ${payload.propertyId}, ${payload.name}, ${payload.email}, ${payload.role})`);
    if result is sql:Error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to invite staff account", description: result.message()}};
    }
    return {id, propertyId: payload.propertyId, name: payload.name, email: payload.email, role: payload.role};
}

function updateStaffAccountHandler(string staffAccountId, StaffAccount payload) returns StaffAccount|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "staff account not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`UPDATE staff_accounts
        SET name = ${payload.name}, email = ${payload.email}, role = ${payload.role}
        WHERE id = ${staffAccountId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "staff account not found"}};
    }
    return {id: staffAccountId, propertyId: payload.propertyId, name: payload.name, email: payload.email, role: payload.role};
}

function removeStaffAccountHandler(string staffAccountId) returns http:NoContent|ErrorNotFound {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return <ErrorNotFound>{body: {code: 404, message: "staff account not found"}};
    }
    sql:ExecutionResult|sql:Error result = dbc->execute(`DELETE FROM staff_accounts WHERE id = ${staffAccountId}`);
    if affectedNone(result) {
        return <ErrorNotFound>{body: {code: 404, message: "staff account not found"}};
    }
    return http:NO_CONTENT;
}
