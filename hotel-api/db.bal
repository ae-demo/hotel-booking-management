import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

// The single source of truth for room-type availability, properties, reservations
// and every other entity this service owns. Connection details are the platform's
// hotel-db (postgres-cnpg) wiring; every field has a sensible local-dev fallback so
// the service starts even when the platform has not injected real credentials yet
// (component contract: no required environment variables).
//
// `dbClient` is `()` when the database could not be reached at startup. Every
// DB-touching handler goes through `requireDb()`, which turns that into a 503
// rather than letting a missing DB crash the process or corrupt in-memory state —
// there is no in-memory fallback store, so a request that needs the DB and cannot
// reach it simply fails that one request.
final postgresql:Client? dbClient = initDbClient();

function initDbClient() returns postgresql:Client? {
    string host = hotelDbHost.trim() == "" ? "localhost" : hotelDbHost;
    int port = 5432;
    if hotelDbPort.trim() != "" {
        int|error parsed = int:fromString(hotelDbPort);
        if parsed is int {
            port = parsed;
        }
    }
    string database = hotelDbName.trim() == "" ? "postgres" : hotelDbName;
    string user = hotelDbUser.trim() == "" ? "postgres" : hotelDbUser;
    string password = hotelDbPassword.trim() == "" ? "postgres" : hotelDbPassword;

    postgresql:Client|sql:Error newClient = new (host = host, port = port, username = user,
        password = password, database = database, options = {connectTimeout: 5});
    if newClient is sql:Error {
        log:printError("hotel-db unreachable at startup; DB-backed operations will fail until it is",
            'error = newClient, host = host, port = port);
        return ();
    }
    error? schemaResult = createSchema(newClient);
    if schemaResult is error {
        log:printError("hotel-db schema initialization failed", 'error = schemaResult);
        return ();
    }
    return newClient;
}

function createSchema(postgresql:Client dbc) returns error? {
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS properties (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            currency TEXT NOT NULL
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS room_types (
            id TEXT PRIMARY KEY,
            property_id TEXT NOT NULL,
            name TEXT NOT NULL,
            occupancy INT NOT NULL,
            base_rate NUMERIC NOT NULL
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS rate_plans (
            id TEXT PRIMARY KEY,
            room_type_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            rate NUMERIC NOT NULL
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS availability_days (
            room_type_id TEXT NOT NULL,
            day TEXT NOT NULL,
            rooms_available INT NOT NULL,
            PRIMARY KEY (room_type_id, day)
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS guests (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
            owner_sub TEXT
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            property_id TEXT NOT NULL,
            room_type_id TEXT NOT NULL,
            guest_id TEXT,
            check_in TEXT NOT NULL,
            check_out TEXT NOT NULL,
            status TEXT NOT NULL,
            source TEXT NOT NULL,
            channel_name TEXT,
            channel_connection_id TEXT,
            owner_sub TEXT,
            amount NUMERIC,
            created_at TEXT NOT NULL
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            reservation_id TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            status TEXT NOT NULL,
            provider_reference TEXT
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS staff_accounts (
            id TEXT PRIMARY KEY,
            property_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS channel_connections (
            id TEXT PRIMARY KEY,
            property_id TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            status TEXT NOT NULL,
            last_synced_at TEXT
        )`);
    _ = check dbc->execute(`
        CREATE TABLE IF NOT EXISTS sync_events (
            id TEXT PRIMARY KEY,
            channel_connection_id TEXT NOT NULL,
            direction TEXT NOT NULL,
            outcome TEXT NOT NULL,
            occurred_at TEXT NOT NULL
        )`);
}

// The DB client, or a 503 for a handler to return as-is when the database could
// not be reached at startup.
function requireDb() returns postgresql:Client|http:InternalServerError {
    postgresql:Client? dbc = dbClient;
    if dbc is () {
        return <http:InternalServerError>{body: {code: 500, message: "database unavailable"}};
    }
    return dbc;
}

// True when an UPDATE/DELETE either failed outright or matched no row —
// the one check a "not found" handler needs, without repeating the narrowing
// at every call site.
function affectedNone(sql:ExecutionResult|sql:Error result) returns boolean {
    if result is sql:Error {
        return true;
    }
    int? affected = result.affectedRowCount;
    return affected is () || affected == 0;
}
