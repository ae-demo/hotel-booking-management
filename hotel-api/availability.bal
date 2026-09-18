import ballerina/http;
import ballerina/sql;
import ballerinax/postgresql;

// The availability_days table is the ONE source of truth for room-type
// inventory. A direct booking, a front-desk walk-in and a channel-sourced
// reservation all reserve nights through `reserveNights` below, so a room sold
// on any source is unavailable on every other — there is no per-source counter
// anywhere else to drift out of sync.

function getAvailabilityCalendar(postgresql:Client dbc, string roomTypeId, string? 'from, string? to)
        returns AvailabilityDay[]|error {
    sql:ParameterizedQuery query = `SELECT day AS "date", rooms_available AS "roomsAvailable"
        FROM availability_days WHERE room_type_id = ${roomTypeId}`;
    if 'from is string {
        query = sql:queryConcat(query, ` AND day >= ${'from}`);
    }
    if to is string {
        query = sql:queryConcat(query, ` AND day <= ${to}`);
    }
    query = sql:queryConcat(query, ` ORDER BY day`);
    stream<AvailabilityDay, sql:Error?> rows = dbc->query(query);
    AvailabilityDay[] days = [];
    check from AvailabilityDay day in rows
        do {
            days.push(day);
        };
    return days;
}

function upsertAvailabilityCalendar(postgresql:Client dbc, string roomTypeId, AvailabilityDay[] updates)
        returns AvailabilityDay[]|error {
    foreach AvailabilityDay day in updates {
        _ = check dbc->execute(`
            INSERT INTO availability_days (room_type_id, day, rooms_available)
            VALUES (${roomTypeId}, ${day.date}, ${day.roomsAvailable})
            ON CONFLICT (room_type_id, day)
            DO UPDATE SET rooms_available = EXCLUDED.rooms_available`);
    }
    return getAvailabilityCalendar(dbc, roomTypeId, (), ());
}

# Atomically reserves one room on every night of `[checkIn, checkOut)` for a
# room type, decrementing `rooms_available` only when every night in the range
# has at least one room free. Either every night is reserved or none are —
# never a partial hold — which is what keeps overbooking impossible regardless
# of which of the three sources (direct, front-desk, channel) is booking.
#
# + return - true when the stay was reserved, false when some night in the
#   range has no room left (or was never configured), or an `error` on a DB
#   fault
function reserveNights(postgresql:Client dbc, string roomTypeId, string checkIn, string checkOut)
        returns boolean|error {
    string[] nights = check nightsBetween(checkIn, checkOut);
    if nights.length() == 0 {
        return error("checkOut must be after checkIn");
    }
    boolean ok = true;
    transaction {
        foreach string night in nights {
            sql:ExecutionResult result = check dbc->execute(`
                UPDATE availability_days SET rooms_available = rooms_available - 1
                WHERE room_type_id = ${roomTypeId} AND day = ${night} AND rooms_available > 0`);
            int? affected = result.affectedRowCount;
            if affected is () || affected == 0 {
                ok = false;
                break;
            }
        }
        if !ok {
            rollback;
        } else {
            check commit;
        }
    }
    return ok;
}

# Releases the nights a cancelled reservation held, putting the room back into
# every channel's inventory. Not transactional: incrementing a subset back on
# a partial failure never overbooks, it only under-counts availability by the
# nights that failed to release, which a retry (or the next PUT from an
# operator) heals — the opposite failure mode to a booking, which is why only
# `reserveNights` needs the all-or-nothing guarantee.
function releaseNights(postgresql:Client dbc, string roomTypeId, string checkIn, string checkOut) returns error? {
    string[] nights = check nightsBetween(checkIn, checkOut);
    foreach string night in nights {
        _ = check dbc->execute(`
            UPDATE availability_days SET rooms_available = rooms_available + 1
            WHERE room_type_id = ${roomTypeId} AND day = ${night}`);
    }
}

function availabilityCalendarHandler(string roomTypeId, string? 'from, string? to)
        returns AvailabilityDay[]|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    AvailabilityDay[]|error result = getAvailabilityCalendar(dbc, roomTypeId, 'from, to);
    if result is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to read availability", description: result.message()}};
    }
    return result;
}
