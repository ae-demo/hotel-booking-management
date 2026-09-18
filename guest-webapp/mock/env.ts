// Mock mode's window._env_ — exactly the keys the platform actually emits for
// this app's `user-auth` dependency (react-webapp's key table): the four SPA
// OIDC keys. No sibling API URL (hotel-api is same-origin /api) and no
// USER_AUTH_JWKS_URL (only the API gateway ever validates against it).
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // The OIDC scopes are singular `group`/`ou`, then every handle this
  // project's catalog declares — exactly as the platform requests them,
  // whether or not the signed-in role is granted all of them.
  USER_AUTH_SCOPES:
    "openid profile email group ou " +
    "channel-connections:manage channel-connections:read properties:manage " +
    "reports:read reservations:cancel reservations:create reservations:manage " +
    "reservations:read reservations:read-all room-inventory:manage " +
    "staff-accounts:manage staff-accounts:read sync-events:read",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/hotel-booking-management",
};
