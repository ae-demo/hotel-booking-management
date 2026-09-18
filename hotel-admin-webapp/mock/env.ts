// mock/env.ts — YOURS. window._env_ under `npm run dev:mock`: exactly the
// keys the platform actually emits for this component (src/env.ts's Env
// type) and nothing else. No sibling API URL — hotel-api is same-origin /api.
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // The OIDC scopes plus every handle in specs/design/security.json's catalog,
  // exactly as the platform would request them for this project.
  USER_AUTH_SCOPES:
    "openid profile email group ou " +
    "properties:manage room-inventory:manage " +
    "reservations:read reservations:create reservations:cancel reservations:read-all reservations:manage " +
    "staff-accounts:read staff-accounts:manage " +
    "channel-connections:read channel-connections:manage sync-events:read reports:read",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/hotel-booking-management",
};
