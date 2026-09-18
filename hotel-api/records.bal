// Internal row shapes that carry a few DB-only columns the public OpenAPI
// schemas (in openapi_service.bal) do not expose. Each maps 1:1 onto a SQL
// query whose column aliases already match these field names.

// A reservation as stored, including the fields `Reservation` does not carry:
// the caller's `sub` for `/me/reservations` resolution, the channel connection
// it came from, and the amount charged.
public type ReservationRow record {|
    string id;
    string propertyId;
    string roomTypeId;
    string? guestId;
    string checkIn;
    string checkOut;
    string status;
    string 'source;
    string? channelName;
    string? channelConnectionId;
    string? ownerSub;
    decimal? amount;
    string createdAt;
|};

public type GuestInput record {|
    string? name;
    string? email;
    string? phone;
    boolean whatsappOptIn;
    string? ownerSub;
|};

// A guest's contact details, read back for a cancellation notification.
public type GuestContact record {|
    string? email;
    string? phone;
    boolean whatsappOptIn;
    string? name;
|};
