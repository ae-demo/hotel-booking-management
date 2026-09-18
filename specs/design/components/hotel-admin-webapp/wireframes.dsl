screen ManagerDashboard "Hotel Manager landing: bookings and revenue at a glance"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Overview"
  row
    card "Bookings this month | 128 | across all properties"
    card "Revenue this month | 18,400.00 | across all properties"
    card "Connected channels | 3 | OTA channels live"
  chart "Bookings by source (30 days)" 600x260

screen Properties "Every property this account manages"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  row
    heading "Properties"
    right
    button "New Property" primary -> PropertyForm
  table "Name | Currency | Room Types" -> PropertyDetail
    row "Seaside Hotel | LKR | 4"
    row "Hillside Inn | LKR | 2"

screen PropertyForm "Create or edit a property"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Property details"
  input "Name"
  input "Address"
  select "Currency"
  row
    right
    button "Cancel"
    button "Save Property" primary -> PropertyDetail

screen PropertyDetail "One property's room types and rates"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Seaside Hotel"
  row
    right
    button "New Room Type" primary -> RoomTypeForm
  table "Room Type | Occupancy | Base Rate" -> RoomTypeDetail
    row "Deluxe Room | 2 | 120.00"
    row "Family Suite | 4 | 210.00"

screen RoomTypeForm "Create or edit a room type"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Room type details"
  input "Name"
  input "Occupancy"
  input "Base rate"
  row
    right
    button "Cancel"
    button "Save Room Type" primary -> RoomTypeDetail

screen RoomTypeDetail "A room type's rate plans and availability calendar"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Deluxe Room"
  card "Base rate | 120.00 | per night"
  table "Start | End | Rate"
    row "2026-12-20 | 2027-01-05 | 180.00"
  heading "Availability calendar"
  chart "Rooms available by day" 600x220

screen StaffAccounts "Front Desk Staff and Channel Manager Operator accounts"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  row
    heading "Staff accounts"
    right
    button "Invite Staff" primary -> StaffAccountForm
  table "Name | Email | Role" -> StaffAccountForm
    row "Nadia Perera | nadia@seaside.example | FrontDeskAgent"
    row "Ruwan Silva | ruwan@seaside.example | ChannelOperator"

screen StaffAccountForm "Invite or edit a staff account"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Staff account"
  input "Name"
  input "Email"
  select "Role"
  row
    right
    button "Cancel"
    button "Save" primary -> StaffAccounts

screen Reports "Booking and revenue reports across properties and channels"
  navbar "Hotel Back Office"
  sidebar "Dashboard -> ManagerDashboard | Properties -> Properties | Staff -> StaffAccounts | Reports -> Reports"
  heading "Reports"
  row
    select "Property"
    input "From"
    input "To"
    right
    button "Export CSV"
  chart "Revenue by channel" 600x260
  table "Property | Direct | Channel | Total Revenue"
    row "Seaside Hotel | 62 | 41 | 12,400.00"

screen ReservationsQueue "Front Desk landing: every reservation, any source"
  navbar "Hotel Back Office"
  sidebar "Reservations -> ReservationsQueue"
  row
    heading "Reservations"
    right
    button "New Walk-in Reservation" primary -> WalkInReservationForm
  table "Guest | Room Type | Dates | Source | Status" -> ReservationDetailAdmin
    row "J. Fernando | Deluxe Room | 2026-10-02 - 2026-10-05 | Direct | Confirmed"
    row "A. Khan | Family Suite | 2026-10-04 - 2026-10-06 | Booking.com | Confirmed"

screen WalkInReservationForm "Create a walk-in or phone reservation"
  navbar "Hotel Back Office"
  sidebar "Reservations -> ReservationsQueue"
  heading "New reservation"
  select "Property"
  select "Room Type"
  input "Check-in"
  input "Check-out"
  input "Guest name"
  input "Guest phone"
  row
    right
    button "Cancel"
    button "Create Reservation" primary -> ReservationDetailAdmin

screen ReservationDetailAdmin "View, modify, check in/out or cancel a reservation"
  navbar "Hotel Back Office"
  sidebar "Reservations -> ReservationsQueue"
  heading "J. Fernando — Deluxe Room"
  text "2026-10-02 - 2026-10-05 · Source: Direct"
  badge "Confirmed" success
  row
    button "Check In" primary
    button "Check Out"
    right
    button "Cancel Reservation" danger

screen ChannelConnections "Channel Operator landing: every connection and its status"
  navbar "Hotel Back Office"
  sidebar "Channels -> ChannelConnections"
  row
    heading "Channel connections"
    right
    button "Connect Channel" primary -> ChannelConnectionForm
  table "Channel | Property | Status | Last Synced" -> ChannelConnectionDetail
    row "Booking.com | Seaside Hotel | Connected | 2 minutes ago"
    row "Expedia | Seaside Hotel | Error | 1 hour ago"

screen ChannelConnectionForm "Connect a property to an OTA channel"
  navbar "Hotel Back Office"
  sidebar "Channels -> ChannelConnections"
  heading "Connect a channel"
  select "Property"
  select "Channel"
  input "Channel account ID"
  row
    right
    button "Cancel"
    button "Connect" primary -> ChannelConnectionDetail

screen ChannelConnectionDetail "A channel connection's sync status and history"
  navbar "Hotel Back Office"
  sidebar "Channels -> ChannelConnections"
  heading "Expedia — Seaside Hotel"
  badge "Error" danger
  row
    right
    button "Disconnect" danger
  heading "Sync history"
  table "When | Direction | Outcome"
    row "2026-09-18 10:02 | Push | Failed"
    row "2026-09-18 09:00 | Pull | Success"

flow "Manage properties and staff"
  role "HotelManager"
  description "A Hotel Manager configures properties, rooms, rates, staff and views reports"
  ManagerDashboard
  Properties
  PropertyForm
  PropertyDetail
  RoomTypeForm
  RoomTypeDetail
  StaffAccounts
  StaffAccountForm
  Reports

flow "Handle reservations"
  role "FrontDeskAgent"
  description "Front Desk Staff creates walk-in reservations and manages check-in/check-out"
  ReservationsQueue
  WalkInReservationForm
  ReservationDetailAdmin

flow "Manage channel connections"
  role "ChannelOperator"
  description "A Channel Manager Operator connects OTA channels and monitors sync status"
  ChannelConnections
  ChannelConnectionForm
  ChannelConnectionDetail
