screen Home "Search for a room across properties"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "Find your stay"
  row
    select "Property"
    input "Check-in"
    input "Check-out"
    input "Guests"
    right
    button "Search" primary -> SearchResults

screen SearchResults "Room types matching the search"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "Available rooms"
  table "Room Type | Property | Rate/night | Occupancy" -> RoomDetail
    row "Deluxe Room | Seaside Hotel | 120.00 | 2"
    row "Family Suite | Seaside Hotel | 210.00 | 4"

screen RoomDetail "A room type's details and rate"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "Deluxe Room"
  text "Seaside Hotel — 120.00/night"
  text "Free cancellation up to 24 hours before check-in"
  button "Book Now" primary -> Checkout

screen Checkout "Guest details and online payment"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "Confirm and pay"
  input "Full name"
  input "Email"
  input "Phone"
  checkbox "Also notify me on WhatsApp"
  divider
  text "Total due: 240.00"
  row
    right
    button "Cancel"
    button "Pay and Book" primary -> BookingConfirmation

screen BookingConfirmation "Booking confirmed"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "You're booked!"
  text "A confirmation has been emailed to you."
  card "Reservation" "CONF-1042"
    text "Deluxe Room, Seaside Hotel"
    text "Check-in 2026-10-02 · Check-out 2026-10-05"
  button "View My Reservations" -> MyReservations

screen MyReservations "The guest's own upcoming reservations"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "My reservations"
  table "Property | Dates | Status" -> ReservationDetail
    row "Seaside Hotel | 2026-10-02 - 2026-10-05 | Confirmed"
    row "Hillside Inn | 2026-11-10 - 2026-11-12 | Confirmed"

screen ReservationDetail "One reservation, with cancel"
  navbar "Hotel Booking"
  sidebar "Search -> Home | My Reservations -> MyReservations"
  heading "Seaside Hotel"
  text "Deluxe Room · 2026-10-02 - 2026-10-05"
  badge "Confirmed" success
  row
    right
    button "Cancel Reservation" danger

flow "Book a room"
  role "Guest"
  description "A guest searches for a room, books and pays online, and receives a confirmation"
  Home
  SearchResults
  RoomDetail
  Checkout
  BookingConfirmation

flow "Manage my reservations"
  role "Guest"
  description "A guest views and cancels their own upcoming reservations"
  MyReservations
  ReservationDetail
