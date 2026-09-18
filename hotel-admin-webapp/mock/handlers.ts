// mock/handlers.ts — YOURS. One handler per hotel-api operation this app
// calls, seeded to match specs/design/components/hotel-admin-webapp/
// wireframes.dsl's own example rows (node .claude/skills/wireframes/scripts/
// seed.mjs), so the running mock agrees with the rendered wireframe.
//
// State lives in module scope, reset on every full page load — the app's own
// navigation carries a change forward, a reload puts the seed back.
//
// NO scope check here: mock/authz/gateway.ts is the gateway layer and answers
// that question before a request reaches these handlers, exactly as the real
// API gateway does in a cell.
import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/hotel-api";

type Property = components["schemas"]["Property"];
type RoomType = components["schemas"]["RoomType"];
type RatePlan = components["schemas"]["RatePlan"];
type AvailabilityDay = components["schemas"]["AvailabilityDay"];
type Reservation = components["schemas"]["Reservation"];
type ReservationCreate = components["schemas"]["ReservationCreate"];
type StaffAccount = components["schemas"]["StaffAccount"];
type ChannelConnection = components["schemas"]["ChannelConnection"];
type SyncEvent = components["schemas"]["SyncEvent"];
type BookingReport = components["schemas"]["BookingReport"];

let nextId = 100;
const freshId = (prefix: string): string => `${prefix}-${nextId++}`;

let properties: Property[] = [
  { id: "prop-seaside", name: "Seaside Hotel", address: "12 Galle Road, Colombo", currency: "LKR" },
  { id: "prop-hillside", name: "Hillside Inn", address: "5 Hill Street, Kandy", currency: "LKR" },
];

let roomTypes: RoomType[] = [
  { id: "rt-deluxe", propertyId: "prop-seaside", name: "Deluxe Room", occupancy: 2, baseRate: 120.0 },
  { id: "rt-family", propertyId: "prop-seaside", name: "Family Suite", occupancy: 4, baseRate: 210.0 },
  { id: "rt-standard", propertyId: "prop-seaside", name: "Standard Room", occupancy: 2, baseRate: 85.0 },
  { id: "rt-executive", propertyId: "prop-seaside", name: "Executive Suite", occupancy: 3, baseRate: 260.0 },
  { id: "rt-hillside-std", propertyId: "prop-hillside", name: "Standard Room", occupancy: 2, baseRate: 70.0 },
  { id: "rt-hillside-dlx", propertyId: "prop-hillside", name: "Deluxe Room", occupancy: 2, baseRate: 95.0 },
];

let ratePlans: RatePlan[] = [
  { id: "rp-1", roomTypeId: "rt-deluxe", startDate: "2026-12-20", endDate: "2027-01-05", rate: 180.0 },
];

const availability: Record<string, AvailabilityDay[]> = {
  "rt-deluxe": [
    { date: "2026-10-01", roomsAvailable: 5 },
    { date: "2026-10-02", roomsAvailable: 4 },
    { date: "2026-10-03", roomsAvailable: 4 },
    { date: "2026-10-04", roomsAvailable: 3 },
    { date: "2026-10-05", roomsAvailable: 3 },
    { date: "2026-10-06", roomsAvailable: 5 },
    { date: "2026-10-07", roomsAvailable: 5 },
  ],
};

let reservations: Reservation[] = [
  {
    id: "res-fernando",
    propertyId: "prop-seaside",
    roomTypeId: "rt-deluxe",
    guestId: "J. Fernando",
    checkIn: "2026-10-02",
    checkOut: "2026-10-05",
    status: "confirmed",
    source: "direct",
    channelName: null,
  },
  {
    id: "res-khan",
    propertyId: "prop-seaside",
    roomTypeId: "rt-family",
    guestId: "A. Khan",
    checkIn: "2026-10-04",
    checkOut: "2026-10-06",
    status: "confirmed",
    source: "channel",
    channelName: "Booking.com",
  },
];

let staffAccounts: StaffAccount[] = [
  {
    id: "staff-nadia",
    propertyId: "prop-seaside",
    name: "Nadia Perera",
    email: "nadia@seaside.example",
    role: "FrontDeskAgent",
  },
  {
    id: "staff-ruwan",
    propertyId: "prop-seaside",
    name: "Ruwan Silva",
    email: "ruwan@seaside.example",
    role: "ChannelOperator",
  },
];

let channelConnections: ChannelConnection[] = [
  {
    id: "chan-booking",
    propertyId: "prop-seaside",
    channelName: "Booking.com",
    status: "connected",
    lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "chan-expedia",
    propertyId: "prop-seaside",
    channelName: "Expedia",
    status: "error",
    lastSyncedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: "chan-airbnb",
    propertyId: "prop-hillside",
    channelName: "Airbnb",
    status: "connected",
    lastSyncedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
];

const syncEvents: Record<string, SyncEvent[]> = {
  "chan-expedia": [
    { id: "sync-1", channelConnectionId: "chan-expedia", direction: "push", outcome: "failed", occurredAt: "2026-09-18T10:02:00Z" },
    { id: "sync-2", channelConnectionId: "chan-expedia", direction: "pull", outcome: "success", occurredAt: "2026-09-18T09:00:00Z" },
  ],
  "chan-booking": [
    { id: "sync-3", channelConnectionId: "chan-booking", direction: "push", outcome: "success", occurredAt: "2026-09-18T09:55:00Z" },
  ],
  "chan-airbnb": [
    { id: "sync-4", channelConnectionId: "chan-airbnb", direction: "pull", outcome: "success", occurredAt: "2026-09-18T09:45:00Z" },
  ],
};

// Sums to the wireframe's own stat cards: 62+18=80… kept per-property so the
// Reports table row for Seaside Hotel (62 direct / 41 channel / 12,400.00) and
// the Dashboard's "128 bookings / 18,400.00 revenue" both match the DSL's
// literal seed values (103+25 bookings, 12400+6000 revenue).
const bookingReports: BookingReport[] = [
  { propertyId: "prop-seaside", totalBookings: 103, totalRevenue: 12400.0, directBookings: 62, channelBookings: 41 },
  { propertyId: "prop-hillside", totalBookings: 25, totalRevenue: 6000.0, directBookings: 18, channelBookings: 7 },
];

export const handlers = [
  // --- Properties ---------------------------------------------------------
  http.get("/api/properties", () => HttpResponse.json({ count: properties.length, next: null, previous: null, data: properties })),

  http.post("/api/properties", async ({ request }) => {
    const body = (await request.json()) as Property;
    const created: Property = { ...body, id: freshId("prop") };
    properties = [...properties, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/properties/:propertyId", ({ params }) => {
    const property = properties.find((p) => p.id === params.propertyId);
    return property
      ? HttpResponse.json(property)
      : HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
  }),

  http.put("/api/properties/:propertyId", async ({ params, request }) => {
    const body = (await request.json()) as Property;
    const updated: Property = { ...body, id: String(params.propertyId) };
    properties = properties.map((p) => (p.id === params.propertyId ? updated : p));
    return HttpResponse.json(updated);
  }),

  http.delete("/api/properties/:propertyId", ({ params }) => {
    const before = properties.length;
    properties = properties.filter((p) => p.id !== params.propertyId);
    return before === properties.length
      ? HttpResponse.json({ code: 404, message: "not found" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  // --- Room types ----------------------------------------------------------
  http.get("/api/properties/:propertyId/room-types", ({ params }) => {
    const data = roomTypes.filter((rt) => rt.propertyId === params.propertyId);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/properties/:propertyId/room-types", async ({ params, request }) => {
    const body = (await request.json()) as RoomType;
    const created: RoomType = { ...body, id: freshId("rt"), propertyId: String(params.propertyId) };
    roomTypes = [...roomTypes, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/room-types/:roomTypeId", async ({ params, request }) => {
    const body = (await request.json()) as RoomType;
    const updated: RoomType = { ...body, id: String(params.roomTypeId) };
    roomTypes = roomTypes.map((rt) => (rt.id === params.roomTypeId ? updated : rt));
    return HttpResponse.json(updated);
  }),

  http.delete("/api/room-types/:roomTypeId", ({ params }) => {
    const before = roomTypes.length;
    roomTypes = roomTypes.filter((rt) => rt.id !== params.roomTypeId);
    return before === roomTypes.length
      ? HttpResponse.json({ code: 404, message: "not found" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/room-types/:roomTypeId/rate-plans", ({ params }) => {
    const data = ratePlans.filter((rp) => rp.roomTypeId === params.roomTypeId);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/room-types/:roomTypeId/rate-plans", async ({ params, request }) => {
    const body = (await request.json()) as RatePlan;
    const created: RatePlan = { ...body, id: freshId("rp"), roomTypeId: String(params.roomTypeId) };
    ratePlans = [...ratePlans, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/room-types/:roomTypeId/availability", ({ params }) =>
    HttpResponse.json(availability[String(params.roomTypeId)] ?? []),
  ),

  http.put("/api/room-types/:roomTypeId/availability", async ({ params, request }) => {
    const body = (await request.json()) as AvailabilityDay[];
    availability[String(params.roomTypeId)] = body;
    return HttpResponse.json(body);
  }),

  // --- Reservations ----------------------------------------------------------
  http.get("/api/reservations", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");
    const status = url.searchParams.get("status");
    const data = reservations.filter(
      (r) => (!propertyId || r.propertyId === propertyId) && (!status || r.status === status),
    );
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/reservations", async ({ request }) => {
    const body = (await request.json()) as ReservationCreate;
    const created: Reservation = {
      id: freshId("res"),
      propertyId: body.propertyId,
      roomTypeId: body.roomTypeId,
      guestId: body.guestName,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      status: "confirmed",
      source: "front-desk",
      channelName: null,
    };
    reservations = [...reservations, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/reservations/:reservationId", ({ params }) => {
    const reservation = reservations.find((r) => r.id === params.reservationId);
    return reservation
      ? HttpResponse.json(reservation)
      : HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
  }),

  http.put("/api/reservations/:reservationId", async ({ params, request }) => {
    const body = (await request.json()) as ReservationCreate;
    const existing = reservations.find((r) => r.id === params.reservationId);
    if (!existing) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
    const updated: Reservation = { ...existing, ...body, guestId: body.guestName ?? existing.guestId };
    reservations = reservations.map((r) => (r.id === params.reservationId ? updated : r));
    return HttpResponse.json(updated);
  }),

  http.post("/api/reservations/:reservationId/cancel", ({ params }) =>
    transitionReservation(String(params.reservationId), "cancelled"),
  ),
  http.post("/api/reservations/:reservationId/check-in", ({ params }) =>
    transitionReservation(String(params.reservationId), "checked-in"),
  ),
  http.post("/api/reservations/:reservationId/check-out", ({ params }) =>
    transitionReservation(String(params.reservationId), "checked-out"),
  ),

  // --- Staff accounts ----------------------------------------------------------
  http.get("/api/staff-accounts", () =>
    HttpResponse.json({ count: staffAccounts.length, next: null, previous: null, data: staffAccounts }),
  ),

  http.post("/api/staff-accounts", async ({ request }) => {
    const body = (await request.json()) as StaffAccount;
    const created: StaffAccount = { ...body, id: freshId("staff") };
    staffAccounts = [...staffAccounts, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/staff-accounts/:staffAccountId", async ({ params, request }) => {
    const body = (await request.json()) as StaffAccount;
    const updated: StaffAccount = { ...body, id: String(params.staffAccountId) };
    staffAccounts = staffAccounts.map((s) => (s.id === params.staffAccountId ? updated : s));
    return HttpResponse.json(updated);
  }),

  http.delete("/api/staff-accounts/:staffAccountId", ({ params }) => {
    const before = staffAccounts.length;
    staffAccounts = staffAccounts.filter((s) => s.id !== params.staffAccountId);
    return before === staffAccounts.length
      ? HttpResponse.json({ code: 404, message: "not found" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  // --- Channel connections ----------------------------------------------------------
  http.get("/api/channel-connections", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");
    const data = channelConnections.filter((c) => !propertyId || c.propertyId === propertyId);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/channel-connections", async ({ request }) => {
    const body = (await request.json()) as ChannelConnection;
    const created: ChannelConnection = { ...body, id: freshId("chan"), lastSyncedAt: null };
    channelConnections = [...channelConnections, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/channel-connections/:channelConnectionId", async ({ params, request }) => {
    const body = (await request.json()) as ChannelConnection;
    const updated: ChannelConnection = { ...body, id: String(params.channelConnectionId) };
    channelConnections = channelConnections.map((c) =>
      c.id === params.channelConnectionId ? updated : c,
    );
    return HttpResponse.json(updated);
  }),

  http.delete("/api/channel-connections/:channelConnectionId", ({ params }) => {
    const before = channelConnections.length;
    channelConnections = channelConnections.filter((c) => c.id !== params.channelConnectionId);
    return before === channelConnections.length
      ? HttpResponse.json({ code: 404, message: "not found" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/channel-connections/:channelConnectionId/sync-events", ({ params }) => {
    const data = syncEvents[String(params.channelConnectionId)] ?? [];
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  // --- Reports ----------------------------------------------------------
  http.get("/api/reports/bookings", () => HttpResponse.json(bookingReports)),
  http.get("/api/reports/revenue", () => HttpResponse.json(bookingReports)),
];

function transitionReservation(id: string, status: Reservation["status"]) {
  const existing = reservations.find((r) => r.id === id);
  if (!existing) return HttpResponse.json({ code: 404, message: "not found" }, { status: 404 });
  const updated: Reservation = { ...existing, status };
  reservations = reservations.map((r) => (r.id === id ? updated : r));
  return HttpResponse.json(updated);
}
