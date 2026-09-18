// Generated from specs/design/components/hotel-api/openapi.yaml by `bal openapi`,
// then filled in by hand: every resource body, plus the gateway-assertion
// interceptor wiring (see gateway_assertion.bal / the `ballerina` skill).

import ballerina/http;
import ballerinax/postgresql;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    resource function delete channel\-connections/[string channelConnectionId]() returns http:NoContent|ErrorNotFound {
        return disconnectChannelHandler(channelConnectionId);
    }

    # Delete a property
    #
    # + return - returns can be any of following types
    # http:NoContent (Property deleted)
    # http:NotFound (Not found)
    resource function delete properties/[string propertyId]() returns http:NoContent|ErrorNotFound {
        return deletePropertyHandler(propertyId);
    }

    resource function delete room\-types/[string roomTypeId]() returns http:NoContent|ErrorNotFound {
        return deleteRoomTypeHandler(roomTypeId);
    }

    resource function delete staff\-accounts/[string staffAccountId]() returns http:NoContent|ErrorNotFound {
        return removeStaffAccountHandler(staffAccountId);
    }

    resource function get channel\-connections(string? propertyId, int 'limit = 20, int offset = 0) returns inline_response_200_5|http:InternalServerError {
        return listChannelConnectionsHandler(propertyId, 'limit, offset);
    }

    resource function get channel\-connections/[string channelConnectionId]/sync\-events(int 'limit = 20, int offset = 0) returns inline_response_200_6|http:InternalServerError {
        return listSyncEventsHandler(channelConnectionId, 'limit, offset);
    }

    # Liveness check
    #
    # + return - Service is healthy
    resource function get health() returns http:Ok {
        return {};
    }

    # The caller's own reservations
    #
    # + return - returns can be any of following types
    # http:Ok (The caller's reservations)
    # http:Unauthorized (Not signed in)
    resource function get me/reservations(http:RequestContext ctx, int 'limit = 20, int offset = 0) returns inline_response_200_3|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return <ErrorUnauthorized>{body: {code: 401, message: "not signed in"}};
        }
        return listMyReservationsHandler(caller.userId, 'limit, offset);
    }

    # Every property (public, for guest search)
    #
    # + return - Matching properties
    resource function get properties(int 'limit = 20, int offset = 0) returns inline_response_200|http:InternalServerError {
        return listPropertiesHandler('limit, offset);
    }

    # A property (public)
    #
    # + return - returns can be any of following types
    # http:Ok (The property)
    # http:NotFound (Not found)
    resource function get properties/[string propertyId]() returns Property|ErrorNotFound {
        return getPropertyHandler(propertyId);
    }

    resource function get properties/[string propertyId]/room\-types(string? checkIn, string? checkOut, int? guests, int 'limit = 20, int offset = 0) returns inline_response_200_1|http:InternalServerError {
        return listRoomTypesHandler(propertyId, checkIn, checkOut, guests, 'limit, offset);
    }

    # Booking counts by source across properties and channels
    #
    # + return - Booking report
    resource function get reports/bookings(string? propertyId, string? 'from, string? to) returns BookingReport[]|http:InternalServerError {
        return getBookingReportHandler(propertyId, 'from, to);
    }

    # Revenue totals across properties and channels
    #
    # + return - Revenue report
    resource function get reports/revenue(string? propertyId, string? 'from, string? to) returns BookingReport[]|http:InternalServerError {
        return getRevenueReportHandler(propertyId, 'from, to);
    }

    # Every reservation, any source
    #
    # + return - Matching reservations
    resource function get reservations(string? propertyId, string? status, int 'limit = 20, int offset = 0) returns inline_response_200_3|http:InternalServerError {
        return listReservationsHandler(propertyId, status, 'limit, offset);
    }

    # Any reservation by id
    #
    # + return - returns can be any of following types
    # http:Ok (The reservation)
    # http:NotFound (Not found)
    resource function get reservations/[string reservationId]() returns Reservation|ErrorNotFound {
        return getReservationHandler(reservationId);
    }

    resource function get room\-types/[string roomTypeId]/availability(string? 'from, string? to) returns AvailabilityDay[]|http:InternalServerError {
        return availabilityCalendarHandler(roomTypeId, 'from, to);
    }

    resource function get room\-types/[string roomTypeId]/rate\-plans() returns inline_response_200_2|http:InternalServerError {
        return listRatePlansHandler(roomTypeId);
    }

    resource function get staff\-accounts(int 'limit = 20, int offset = 0) returns inline_response_200_4|http:InternalServerError {
        return listStaffAccountsHandler('limit, offset);
    }

    resource function post channel\-bookings(@http:Payload ChannelBookingNotification payload) returns Reservation|ErrorBadRequest|http:InternalServerError {
        return receiveChannelBookingHandler(payload);
    }

    resource function post channel\-connections(@http:Payload ChannelConnection payload) returns ChannelConnection|ErrorBadRequest|http:InternalServerError {
        return connectChannelHandler(payload);
    }

    # Book a room and pay online for the caller
    #
    # + return - returns can be any of following types
    # http:Created (Reservation confirmed and paid)
    # http:BadRequest (Invalid input or room unavailable)
    # http:PaymentRequired (Payment declined)
    resource function post me/reservations(http:RequestContext ctx, @http:Payload ReservationCreate payload) returns Reservation|ErrorBadRequest|ErrorPaymentRequired|http:InternalServerError|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        return createMyReservationHandler(caller.userId, payload);
    }

    # Cancel the caller's own reservation
    #
    # + return - returns can be any of following types
    # http:Ok (Reservation cancelled)
    # http:NotFound (Not found)
    resource function post me/reservations/[string reservationId]/cancel(http:RequestContext ctx) returns ReservationOk|ErrorNotFound|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        return cancelMyReservationHandler(caller.userId, reservationId);
    }

    # Create a property
    #
    # + return - returns can be any of following types
    # http:Created (Property created)
    # http:BadRequest (Invalid input)
    # http:Unauthorized (Not signed in)
    resource function post properties(@http:Payload Property payload) returns Property|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        return createPropertyHandler(payload);
    }

    resource function post properties/[string propertyId]/room\-types(@http:Payload RoomType payload) returns RoomType|ErrorBadRequest|http:InternalServerError {
        return createRoomTypeHandler(propertyId, payload);
    }

    # Create a walk-in or phone reservation
    #
    # + return - returns can be any of following types
    # http:Created (Reservation created)
    # http:BadRequest (Invalid input or room unavailable)
    resource function post reservations(@http:Payload ReservationCreate payload) returns Reservation|ErrorBadRequest|http:InternalServerError {
        return createWalkInReservationHandler(payload);
    }

    # Cancel any reservation
    #
    # + return - returns can be any of following types
    # http:Ok (Reservation cancelled)
    # http:NotFound (Not found)
    resource function post reservations/[string reservationId]/cancel() returns ReservationOk|ErrorNotFound {
        return cancelReservationHandler(reservationId);
    }

    resource function post reservations/[string reservationId]/check\-in() returns ReservationOk|ErrorNotFound {
        return checkInReservationHandler(reservationId);
    }

    resource function post reservations/[string reservationId]/check\-out() returns ReservationOk|ErrorNotFound {
        return checkOutReservationHandler(reservationId);
    }

    resource function post room\-types/[string roomTypeId]/rate\-plans(@http:Payload RatePlan payload) returns RatePlan|ErrorBadRequest|http:InternalServerError {
        return createRatePlanHandler(roomTypeId, payload);
    }

    resource function post staff\-accounts(@http:Payload StaffAccount payload) returns StaffAccount|ErrorBadRequest|http:InternalServerError {
        return inviteStaffAccountHandler(payload);
    }

    resource function put channel\-connections/[string channelConnectionId](@http:Payload ChannelConnection payload) returns ChannelConnection|ErrorNotFound {
        return updateChannelConnectionHandler(channelConnectionId, payload);
    }

    # Update a property
    #
    # + return - returns can be any of following types
    # http:Ok (Property updated)
    # http:NotFound (Not found)
    resource function put properties/[string propertyId](@http:Payload Property payload) returns Property|ErrorNotFound {
        return updatePropertyHandler(propertyId, payload);
    }

    # Modify any reservation
    #
    # + return - returns can be any of following types
    # http:Ok (Reservation updated)
    # http:NotFound (Not found)
    resource function put reservations/[string reservationId](@http:Payload ReservationCreate payload) returns Reservation|ErrorNotFound {
        return updateReservationHandler(reservationId, payload);
    }

    resource function put room\-types/[string roomTypeId](@http:Payload RoomType payload) returns RoomType|ErrorNotFound {
        return updateRoomTypeHandler(roomTypeId, payload);
    }

    resource function put room\-types/[string roomTypeId]/availability(@http:Payload AvailabilityDay[] payload) returns AvailabilityDay[]|http:InternalServerError {
        postgresql:Client|http:InternalServerError dbc = requireDb();
        if dbc is http:InternalServerError {
            return dbc;
        }
        AvailabilityDay[]|error result = upsertAvailabilityCalendar(dbc, roomTypeId, payload);
        if result is error {
            return <http:InternalServerError>{body: {code: 500, message: "failed to update availability", description: result.message()}};
        }
        pushRoomTypeToChannels(dbc, roomTypeId);
        return result;
    }

    resource function put staff\-accounts/[string staffAccountId](@http:Payload StaffAccount payload) returns StaffAccount|ErrorNotFound {
        return updateStaffAccountHandler(staffAccountId, payload);
    }
}

public type SyncEvent record {
    string id;
    string channelConnectionId;
    "push"|"pull" direction;
    "success"|"failed" outcome;
    string occurredAt;
};

public type inline_response_200_5 record {
    int count;
    string? next?;
    string? previous?;
    ChannelConnection[] data;
};

public type inline_response_200_6 record {
    int count;
    string? next?;
    string? previous?;
    SyncEvent[] data;
};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type ErrorPaymentRequired record {|
    *http:PaymentRequired;
    Error body;
|};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type RatePlan record {
    string id;
    string roomTypeId;
    string startDate;
    string endDate;
    decimal rate;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type Reservation record {
    string id;
    string propertyId;
    string roomTypeId;
    string guestId?;
    string checkIn;
    string checkOut;
    "pending"|"confirmed"|"checked-in"|"checked-out"|"cancelled" status;
    "direct"|"front-desk"|"channel" 'source;
    string? channelName?;
};

public type RoomType record {
    string id;
    string propertyId;
    string name;
    int occupancy;
    decimal baseRate;
};

public type ChannelBookingNotification record {
    string channelConnectionId;
    string roomTypeId;
    string checkIn;
    string checkOut;
    string guestName;
    string guestEmail?;
};

public type ReservationCreate record {
    string propertyId;
    string roomTypeId;
    string checkIn;
    string checkOut;
    string guestName?;
    string guestEmail?;
    string guestPhone?;
    boolean whatsappOptIn?;
};

public type inline_response_200_1 record {
    int count;
    string? next?;
    string? previous?;
    RoomType[] data;
};

public type StaffAccount record {
    string id;
    string propertyId;
    string name;
    string email;
    "HotelManager"|"FrontDeskAgent"|"ChannelOperator" role;
};

public type inline_response_200 record {
    int count;
    string? next?;
    string? previous?;
    Property[] data;
};

public type inline_response_200_2 record {
    int count;
    string? next?;
    string? previous?;
    RatePlan[] data;
};

public type AvailabilityDay record {
    string date;
    int roomsAvailable;
};

public type inline_response_200_3 record {
    int count;
    string? next?;
    string? previous?;
    Reservation[] data;
};

public type ReservationOk record {|
    *http:Ok;
    Reservation body;
|};

public type ChannelConnection record {
    string id;
    string propertyId;
    string channelName;
    "connected"|"disconnected"|"error" status;
    string? lastSyncedAt?;
};

public type inline_response_200_4 record {
    int count;
    string? next?;
    string? previous?;
    StaffAccount[] data;
};

public type Property record {
    string id;
    string name;
    string address?;
    # ISO currency code this property sells in
    string currency;
};

public type BookingReport record {
    string propertyId?;
    int totalBookings?;
    decimal totalRevenue?;
    int directBookings?;
    int channelBookings?;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
