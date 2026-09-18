import ballerina/http;
import ballerina/sql;
import ballerinax/postgresql;

// Booking counts and revenue, split by property and by source (direct vs.
// channel — front-desk counts as direct-sold inventory for revenue purposes
// but is broken out of `directBookings` is not required by the schema, so it
// is folded into `directBookings` alongside `direct`).

type ReportRow record {|
    string propertyId;
    int totalBookings;
    int directBookings;
    int channelBookings;
|};

function getBookingReportHandler(string? propertyId, string? 'from, string? to) returns BookingReport[]|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    sql:ParameterizedQuery query = `SELECT property_id AS "propertyId",
        count(*) AS "totalBookings",
        count(*) FILTER (WHERE source != 'channel') AS "directBookings",
        count(*) FILTER (WHERE source = 'channel') AS "channelBookings"
        FROM reservations WHERE status != 'cancelled'`;
    query = applyReportFilters(query, propertyId, 'from, to);
    query = sql:queryConcat(query, ` GROUP BY property_id`);
    stream<ReportRow, sql:Error?> rows = dbc->query(query);
    ReportRow[]|error reportRows = from ReportRow r in rows select r;
    if reportRows is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to build booking report", description: reportRows.message()}};
    }
    BookingReport[] reports = [];
    foreach ReportRow r in reportRows {
        reports.push({
            propertyId: r.propertyId,
            totalBookings: r.totalBookings,
            directBookings: r.directBookings,
            channelBookings: r.channelBookings
        });
    }
    return reports;
}

type RevenueRow record {|
    string propertyId;
    decimal totalRevenue;
    int directBookings;
    int channelBookings;
|};

function getRevenueReportHandler(string? propertyId, string? 'from, string? to) returns BookingReport[]|http:InternalServerError {
    postgresql:Client|http:InternalServerError dbc = requireDb();
    if dbc is http:InternalServerError {
        return dbc;
    }
    sql:ParameterizedQuery query = `SELECT property_id AS "propertyId",
        coalesce(sum(amount), 0) AS "totalRevenue",
        count(*) FILTER (WHERE source != 'channel') AS "directBookings",
        count(*) FILTER (WHERE source = 'channel') AS "channelBookings"
        FROM reservations WHERE status != 'cancelled'`;
    query = applyReportFilters(query, propertyId, 'from, to);
    query = sql:queryConcat(query, ` GROUP BY property_id`);
    stream<RevenueRow, sql:Error?> rows = dbc->query(query);
    RevenueRow[]|error revenueRows = from RevenueRow r in rows select r;
    if revenueRows is error {
        return <http:InternalServerError>{body: {code: 500, message: "failed to build revenue report", description: revenueRows.message()}};
    }
    BookingReport[] reports = [];
    foreach RevenueRow r in revenueRows {
        reports.push({
            propertyId: r.propertyId,
            totalRevenue: r.totalRevenue,
            directBookings: r.directBookings,
            channelBookings: r.channelBookings
        });
    }
    return reports;
}

function applyReportFilters(sql:ParameterizedQuery query, string? propertyId, string? 'from, string? to)
        returns sql:ParameterizedQuery {
    sql:ParameterizedQuery result = query;
    if propertyId is string {
        result = sql:queryConcat(result, ` AND property_id = ${propertyId}`);
    }
    if 'from is string {
        result = sql:queryConcat(result, ` AND check_in >= ${'from}`);
    }
    if to is string {
        result = sql:queryConcat(result, ` AND check_in <= ${to}`);
    }
    return result;
}
