// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each row names the API
// operation the screen LOADS (or, for a write-only form, the operation its
// submit makes); the gate follows from that operation's requirement in
// ./operations.gen.ts. security.json carries no screen table at all.
//
// Home, SearchResults and RoomDetail load hotel-api operations that are
// themselves `security: []` (public, for guest search) — so they are
// reachable before sign-in regardless of `public`. They are marked `public:
// true` here too, which is the ONLY thing that decides whether App.tsx routes
// them above the forced sign-in redirect: without it, an anonymous visitor
// hitting "/" would be sent straight to Thunder before ever seeing a search
// box, which the design's own acceptance criteria (guest search with no
// login) and hotel-api's contract (these three operations carry `security:
// []`) both rule out.
//
// Checkout, BookingConfirmation, MyReservations and ReservationDetail are
// NOT public: reaching any of them with no session redirects through Thunder
// sign-in, per the issue's acceptance criteria.

import { canCall } from "./rules";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "home", label: "Home", path: "/", loads: "GET /properties", public: true },
  {
    key: "search-results",
    label: "Search Results",
    path: "/search",
    loads: "GET /properties/{propertyId}/room-types",
    public: true,
  },
  {
    key: "room-detail",
    label: "Room Detail",
    path: "/rooms/:roomTypeId",
    loads: "GET /properties/{propertyId}/room-types",
    public: true,
  },
  { key: "checkout", label: "Checkout", path: "/checkout", loads: "POST /me/reservations" },
  {
    key: "booking-confirmation",
    label: "Booking Confirmation",
    path: "/confirmation",
    loads: null,
  },
  {
    key: "my-reservations",
    label: "My Reservations",
    path: "/reservations",
    loads: "GET /me/reservations",
  },
  {
    key: "reservation-detail",
    label: "Reservation Detail",
    path: "/reservations/:reservationId",
    loads: "GET /me/reservations",
  },
];

// FAIL LOUDLY at module load — a committed table that outlived its contract
// must not silently gate on nothing.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

/** The screens a caller can actually open, in rail order. */
export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

/**
 * Does this signed-in caller reach anything their scopes actually earned
 * them? Public and loads-null screens don't count — see
 * thunder-authentication's note on why this is not `reachableScreens(...).length === 0`.
 */
export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some(
    (screen) => !screen.public && screen.loads !== null,
  );
}
