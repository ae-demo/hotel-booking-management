# Domain Model

The core entities behind property, room, rate, availability, channel-sync and reservation management.

```mermaid
erDiagram
    PROPERTY ||--o{ ROOM_TYPE : has
    PROPERTY ||--o{ STAFF_ACCOUNT : employs
    PROPERTY ||--o{ CHANNEL_CONNECTION : connects
    ROOM_TYPE ||--o{ ROOM : includes
    ROOM_TYPE ||--o{ RATE_PLAN : priced-by
    ROOM_TYPE ||--o{ AVAILABILITY_DAY : tracks
    RESERVATION }o--|| ROOM_TYPE : books
    RESERVATION }o--|| GUEST : made-by
    RESERVATION ||--|| PAYMENT : settled-by
    RESERVATION }o--o| CHANNEL_CONNECTION : sourced-from
    CHANNEL_CONNECTION ||--o{ SYNC_EVENT : logs

    PROPERTY {
        string id
        string name
        string address
        string currency
    }
    STAFF_ACCOUNT {
        string id
        string propertyId
        string name
        string email
        string role
    }
    ROOM_TYPE {
        string id
        string propertyId
        string name
        int occupancy
        decimal baseRate
    }
    ROOM {
        string id
        string roomTypeId
        string roomNumber
        string status
    }
    RATE_PLAN {
        string id
        string roomTypeId
        date startDate
        date endDate
        decimal rate
    }
    AVAILABILITY_DAY {
        string id
        string roomTypeId
        date date
        int roomsAvailable
    }
    GUEST {
        string id
        string name
        string email
        string phone
        boolean whatsappOptIn
    }
    RESERVATION {
        string id
        string propertyId
        string roomTypeId
        string guestId
        date checkIn
        date checkOut
        string status
        string source
    }
    PAYMENT {
        string id
        string reservationId
        decimal amount
        string status
        string providerReference
    }
    CHANNEL_CONNECTION {
        string id
        string propertyId
        string channelName
        string status
        datetime lastSyncedAt
    }
    SYNC_EVENT {
        string id
        string channelConnectionId
        string direction
        string outcome
        datetime occurredAt
    }
```

- A `RESERVATION`'s `source` distinguishes direct bookings from a given `CHANNEL_CONNECTION`.
- `SYNC_EVENT` records both push (rate/availability out) and pull (booking in) sync activity, so failures and history are visible per channel.
- `GUEST.whatsappOptIn` gates the optional WhatsApp notification alongside the always-sent email.

