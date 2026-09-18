# hotel-booking-management — PRD

## Problem Statement

Hotels and small hotel groups sell rooms through their own front desk and website while also listing on third-party booking channels (OTAs) such as Booking.com, Expedia and Airbnb. Kept separately, these channels drift out of sync: a room sold on one channel is not blocked on the others, which causes overbooking, manual rate updates across every channel, and staff spending hours reconciling reservations instead of serving guests.

## Solution

A hotel booking management application that lets a hotel — or a small chain of hotels — manage properties, room inventory, rates and reservations from one place, sells rooms directly to guests online, and keeps that inventory synchronized in real time with connected OTA channels, so every channel always reflects true availability.

## Actors

- **Hotel Manager/Admin**: Manages one or more properties end to end — rooms, rates, availability, staff accounts — and views booking and revenue reports across properties and channels.
- **Front Desk Staff**: Handles day-to-day reservations at a property — walk-ins, phone bookings, modifications, cancellations, check-in/check-out — regardless of where a booking originated.
- **Channel Manager Operator**: Configures a property's connections to OTA channels, keeps rates/availability pushed out to them, and monitors and resolves sync issues.
- **Guest**: Searches for rooms, books and pays online, and manages their own upcoming reservations.

## User Stories

1. As a Hotel Manager/Admin, I want to create and manage one or more properties (hotels), so that the system supports a single hotel or a multi-property chain from one account.
2. As a Hotel Manager/Admin, I want to define room types, room inventory, and base rates for each property, so that rooms can be sold both directly and through channels.
3. As a Hotel Manager/Admin, I want to set date-based rate plans and availability calendars, so that pricing reflects demand and season.
4. As a Hotel Manager/Admin, I want to invite and manage Front Desk Staff and Channel Manager Operator accounts for my properties, so that the right people have the right access.
5. As a Hotel Manager/Admin, I want to view booking and revenue reports across all my properties and channels, so that I can track performance.
6. As a Channel Manager Operator, I want to connect a property to one or more OTA channels, so that its rooms can be sold externally.
7. As a Channel Manager Operator, I want rate and availability changes made in the system to automatically push to every connected OTA channel, so that channel listings stay accurate.
8. As a Channel Manager Operator, I want a booking made on a connected OTA channel to automatically appear in the system and reduce availability everywhere else, so that inventory never oversells across channels.
9. As a Channel Manager Operator, I want to see the sync status and history of each channel connection and be alerted to sync failures or conflicts, so that I can resolve issues before they cause overbooking.
10. As a Front Desk Staff, I want to search availability and create a walk-in or phone reservation for a guest, so that I can book rooms that don't come through the online site.
11. As a Front Desk Staff, I want to view, modify, and cancel existing reservations regardless of booking source (direct or channel), so that I can manage the property's full booking calendar.
12. As a Front Desk Staff, I want to check guests in and out and record room/occupancy status, so that I can manage day-to-day operations.
13. As a Guest, I want to search for available rooms by property, dates, and guest count, so that I can find a room that fits my trip.
14. As a Guest, I want to book a room and pay online at the time of booking, so that my reservation is confirmed immediately.
15. As a Guest, I want to receive a booking confirmation and be able to view or cancel my own upcoming reservations, so that I can manage my trip.
16. As a Guest, I want to sign in to the booking site, so that my reservations are tied to my account.

## Product Decisions

- **Sign-in**: All actors sign in via SSO through Thunder, the platform IDP.
- **Property scope**: The product supports both a single hotel and a multi-property chain under one account — properties are a first-class, repeatable unit from the start.
- **Channel management depth**: Full two-way sync — the system pushes rates/availability out to connected OTA channels and automatically pulls channel bookings back in, keeping inventory consistent everywhere to prevent overbooking.
- **OTA connectivity**: The product depends on third-party OTA channel APIs (capability: OTA channel connectivity, e.g. Booking.com, Expedia, Airbnb) — no specific provider is fixed yet; the connections to build are chosen at design time.
- **Online payments**: Guests pay online at time of booking through the Sampath Bank payment gateway. Credentials will be supplied later and the integration configured per its standard settings.
- **Booking notifications**: Guests receive an email confirmation when they book or cancel (capability: transactional email) *assumed*.
- **Currency**: Each property prices and sells in a single configured currency for this version; multi-currency and FX conversion are not in scope *assumed*.

## Out of Scope

- Housekeeping and maintenance workflows (room cleaning status beyond basic occupancy).
- Revenue-management pricing recommendations or AI-driven dynamic pricing.
- Loyalty/rewards programs.
- Native mobile apps (this is a web application).
- Multi-currency pricing and foreign-exchange conversion.
- Accounting/invoicing beyond capturing the guest's payment for a booking.

## Open Questions

1. Which specific OTA channels must be supported at launch (Booking.com, Expedia, Airbnb, others)?
2. Are there specific compliance requirements (e.g. PCI DSS scope, regional data protection) that constrain how payment or guest data is handled?

## Further Notes

None.

