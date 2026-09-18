# Channel Sync

A Channel Manager Operator connects a property to an OTA channel; the system then keeps rates/availability pushed out and pulls channel bookings back in, alerting on sync failures.

```mermaid
sequenceDiagram
    actor Operator as Channel Manager Operator
    participant adminwebapp as hotel-admin-webapp
    participant hotelapi as hotel-api
    participant otachannelservice as ota-channel-service

    Operator->>adminwebapp: connect property to channel
    adminwebapp->>hotelapi: create channel connection
    hotelapi->>otachannelservice: register connection
    otachannelservice-->>hotelapi: connected

    hotelapi->>otachannelservice: push rate/availability update
    alt push fails
        otachannelservice-->>hotelapi: sync failed
        hotelapi-->>adminwebapp: alert operator
    else push succeeds
        otachannelservice-->>hotelapi: sync ok
    end

    otachannelservice->>hotelapi: channel booking notification
    hotelapi->>hotelapi: reduce availability everywhere
    Operator->>adminwebapp: view sync status/history
    adminwebapp->>hotelapi: get sync events
    hotelapi-->>adminwebapp: sync history
```

