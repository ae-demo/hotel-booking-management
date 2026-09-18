// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Adapted from
// thunder-authentication's screens.example.ts pattern for hotel-admin-webapp's
// own screens, in the order specs/design/components/hotel-admin-webapp/
// wireframes.dsl draws them (rail order).
//
// FINDING (design/contract, not a code workaround): hotel-api's
// `GET /properties`, `GET /properties/{propertyId}`,
// `GET /properties/{propertyId}/room-types` and the rate-plan/availability
// reads under a room type are all `security: []` (public — reused by
// guest-webapp's unauthenticated search). The wireframe puts the matching
// admin screens (Properties, PropertyDetail, RoomTypeDetail) inside the
// HotelManager-only flow F1, but the prescribed "gate on the operation this
// screen loads" mechanism can only gate them on that same public operation —
// so any signed-in staff account (FrontDeskAgent, ChannelOperator) can also
// open them for viewing, not just HotelManager. Every WRITE stays correctly
// scope-gated (properties:manage / room-inventory:manage), and this is not
// worked around here by inventing a scope the contract does not declare.

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
  // F1 · Manage properties and staff (HotelManager)
  { key: "dashboard", label: "Dashboard", path: "/dashboard", loads: "GET /reports/bookings" },
  { key: "properties", label: "Properties", path: "/properties", loads: "GET /properties" },
  {
    key: "propertyNew",
    label: "New Property",
    path: "/properties/new",
    loads: "POST /properties",
  },
  {
    key: "propertyDetail",
    label: "Property",
    path: "/properties/:propertyId",
    loads: "GET /properties/{propertyId}",
  },
  {
    key: "roomTypeNew",
    label: "New Room Type",
    path: "/properties/:propertyId/room-types/new",
    loads: "POST /properties/{propertyId}/room-types",
  },
  {
    key: "roomTypeDetail",
    label: "Room Type",
    path: "/properties/:propertyId/room-types/:roomTypeId",
    loads: "GET /room-types/{roomTypeId}/availability",
  },
  { key: "staff", label: "Staff", path: "/staff", loads: "GET /staff-accounts" },
  {
    key: "staffNew",
    label: "Invite Staff",
    path: "/staff/new",
    loads: "POST /staff-accounts",
  },
  {
    key: "staffEdit",
    label: "Edit Staff",
    path: "/staff/:staffAccountId/edit",
    loads: "PUT /staff-accounts/{staffAccountId}",
  },
  { key: "reports", label: "Reports", path: "/reports", loads: "GET /reports/revenue" },

  // F2 · Handle reservations (FrontDeskAgent — also reachable by HotelManager,
  // which holds reservations:read-all for oversight)
  {
    key: "reservations",
    label: "Reservations",
    path: "/reservations",
    loads: "GET /reservations",
  },
  {
    key: "reservationNew",
    label: "New Walk-in Reservation",
    path: "/reservations/new",
    loads: "POST /reservations",
  },
  {
    key: "reservationDetail",
    label: "Reservation",
    path: "/reservations/:reservationId",
    loads: "GET /reservations/{reservationId}",
  },

  // F3 · Manage channel connections (ChannelOperator)
  {
    key: "channels",
    label: "Channel Connections",
    path: "/channels",
    loads: "GET /channel-connections",
  },
  {
    key: "channelNew",
    label: "Connect Channel",
    path: "/channels/new",
    loads: "POST /channel-connections",
  },
  {
    key: "channelDetail",
    label: "Channel Connection",
    path: "/channels/:channelConnectionId",
    loads: "GET /channel-connections/{channelConnectionId}/sync-events",
  },
];

// FAIL LOUDLY, at module load, on a committed table that outlived its
// contract. `loads` is typed as an OperationKey so most drift is already a
// type error; this catches a COMMITTED operations.gen.ts that went stale.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

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

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some(
    (screen) => !screen.public && screen.loads !== null,
  );
}
