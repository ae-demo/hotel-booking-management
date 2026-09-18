// The SERVICE half of mock mode — hotel-api's own behaviour, for exactly the
// operations guest-webapp calls. mock/authz/gateway.ts is the GATEWAY half
// (the 401s); this file writes NO scope check of its own — see
// react-webapp's mock-mode.md.
//
// State lives in module scope, reset on every full page load (a reload, a
// typed URL, a link that leaves the SPA) — only in-app navigation carries a
// change forward. That is what makes a create show up in the next list and a
// cancel persist across the confirmation -> my-reservations -> detail walk,
// and it is also why a booking made mid-run can vanish on a hard reload.
import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/hotel-api";

type Property = components["schemas"]["Property"];
type RoomType = components["schemas"]["RoomType"];
type Reservation = components["schemas"]["Reservation"];
type ReservationCreate = components["schemas"]["ReservationCreate"];

// The signed-in guest every mock session speaks for — single-role app, so
// unlike a multi-role fixture this needs no per-role identity.
export const mockCaller = {
  userId: "01a0ab00-0000-7000-8000-000000000001",
  username: "mock-guest",
};

const properties: Property[] = [
  { id: "prop-seaside", name: "Seaside Hotel", address: "1 Shore Rd", currency: "USD" },
  { id: "prop-hillside", name: "Hillside Inn", address: "22 Ridge Ave", currency: "USD" },
];

const roomTypes: RoomType[] = [
  { id: "rt-deluxe", propertyId: "prop-seaside", name: "Deluxe Room", occupancy: 2, baseRate: 120 },
  { id: "rt-suite", propertyId: "prop-seaside", name: "Family Suite", occupancy: 4, baseRate: 210 },
  { id: "rt-cozy", propertyId: "prop-hillside", name: "Cozy Room", occupancy: 2, baseRate: 95 },
];

let reservations: Reservation[] = [
  {
    id: "CONF-1001",
    propertyId: "prop-seaside",
    roomTypeId: "rt-deluxe",
    guestId: mockCaller.userId,
    checkIn: "2026-10-02",
    checkOut: "2026-10-05",
    status: "confirmed",
    source: "direct",
  },
  {
    id: "CONF-1002",
    propertyId: "prop-hillside",
    roomTypeId: "rt-cozy",
    guestId: mockCaller.userId,
    checkIn: "2026-11-10",
    checkOut: "2026-11-12",
    status: "confirmed",
    source: "direct",
  },
  // Somebody else's reservation, seeded to prove GET /me/reservations shows
  // only the caller's own rows and never this one.
  {
    id: "CONF-9000",
    propertyId: "prop-seaside",
    roomTypeId: "rt-suite",
    guestId: "not-the-caller",
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
    status: "confirmed",
    source: "direct",
  },
];

let nextReservationSeq = 2000;

export const handlers = [
  http.get("/api/properties", () =>
    HttpResponse.json({ count: properties.length, next: null, previous: null, data: properties }),
  ),

  http.get("/api/properties/:propertyId", ({ params }) => {
    const property = properties.find((p) => p.id === params.propertyId);
    return property
      ? HttpResponse.json(property)
      : HttpResponse.json({ code: 404, message: "Not found" }, { status: 404 });
  }),

  http.get("/api/properties/:propertyId/room-types", ({ params, request }) => {
    const url = new URL(request.url);
    const guests = url.searchParams.get("guests");
    let matches = roomTypes.filter((rt) => rt.propertyId === params.propertyId);
    if (guests) matches = matches.filter((rt) => rt.occupancy >= Number(guests));
    return HttpResponse.json({ count: matches.length, next: null, previous: null, data: matches });
  }),

  // The caller's own reservations — the path says so. No reservations:read
  // check here: a caller who does not hold it was refused by
  // mock/authz/gateway.ts and never reached this handler.
  http.get("/api/me/reservations", () => {
    const mine = reservations.filter((r) => r.guestId === mockCaller.userId);
    return HttpResponse.json({ count: mine.length, next: null, previous: null, data: mine });
  }),

  http.post("/api/me/reservations", async ({ request }) => {
    const input = (await request.json()) as ReservationCreate;
    if (!input.propertyId || !input.roomTypeId || !input.checkIn || !input.checkOut) {
      return HttpResponse.json(
        { code: 400, message: "Invalid input", description: "Missing required fields" },
        { status: 400 },
      );
    }
    const roomType = roomTypes.find((rt) => rt.id === input.roomTypeId);
    if (!roomType || roomType.propertyId !== input.propertyId) {
      return HttpResponse.json(
        { code: 400, message: "Room unavailable", description: "Unknown room type for this property" },
        { status: 400 },
      );
    }
    // Simulate a payment decline the walk can trigger deliberately, exactly
    // as hotel-api's payment-service call could decline for real.
    if (input.guestEmail?.toLowerCase().includes("decline")) {
      return HttpResponse.json(
        { code: 402, message: "Payment declined", description: "The card issuer declined the charge" },
        { status: 402 },
      );
    }
    nextReservationSeq += 1;
    const created: Reservation = {
      id: `CONF-${nextReservationSeq}`,
      propertyId: input.propertyId,
      roomTypeId: input.roomTypeId,
      guestId: mockCaller.userId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "confirmed",
      source: "direct",
    };
    reservations = [...reservations, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/me/reservations/:reservationId/cancel", ({ params }) => {
    const index = reservations.findIndex(
      (r) => r.id === params.reservationId && r.guestId === mockCaller.userId,
    );
    // Not the caller's row, or no such row at all — under /me/ that is a 404,
    // never a 403: a caller may not learn a reservation exists if it is not
    // theirs.
    if (index === -1) {
      return HttpResponse.json({ code: 404, message: "Not found" }, { status: 404 });
    }
    const cancelled: Reservation = { ...reservations[index], status: "cancelled" };
    reservations = [...reservations.slice(0, index), cancelled, ...reservations.slice(index + 1)];
    return HttpResponse.json(cancelled);
  }),
];
