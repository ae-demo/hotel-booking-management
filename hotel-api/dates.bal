import ballerina/time;

// Plain "YYYY-MM-DD" strings are this service's date representation end to end —
// the OpenAPI generator drops the `date` format (see openapi_service.bal), and
// storing them as TEXT lets a lexicographic comparison do range queries without
// a SQL date-type bind. These helpers are the only place that walks a calendar.

function twoDigits(int n) returns string {
    return n < 10 ? "0" + n.toString() : n.toString();
}

# Formats a UTC instant as its calendar date, "YYYY-MM-DD".
function formatDate(time:Utc utc) returns string {
    time:Civil c = time:utcToCivil(utc);
    return c.year.toString() + "-" + twoDigits(c.month) + "-" + twoDigits(c.day);
}

# Parses "YYYY-MM-DD" into a UTC instant at midnight.
function parseDate(string dateStr) returns time:Utc|error {
    string[] parts = re `-`.split(dateStr.trim());
    if parts.length() != 3 {
        return error("invalid date, expected YYYY-MM-DD: " + dateStr);
    }
    int y = check int:fromString(parts[0]);
    int m = check int:fromString(parts[1]);
    int d = check int:fromString(parts[2]);
    time:Civil c = {year: y, month: m, day: d, hour: 0, minute: 0, second: 0, utcOffset: {hours: 0, minutes: 0}};
    return time:utcFromCivil(c);
}

# Every calendar day from `checkIn` (inclusive) to `checkOut` (exclusive) — the
# nights a stay occupies. A same-day or inverted range yields no nights.
function nightsBetween(string checkIn, string checkOut) returns string[]|error {
    time:Utc startUtc = check parseDate(checkIn);
    time:Utc endUtc = check parseDate(checkOut);
    string[] days = [];
    time:Utc cur = startUtc;
    while cur < endUtc {
        days.push(formatDate(cur));
        cur = time:utcAddSeconds(cur, 86400);
    }
    return days;
}

# The current instant as RFC3339, for a column this service stores as TEXT.
function nowStamp() returns string {
    return time:utcToString(time:utcNow());
}
