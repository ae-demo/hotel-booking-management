// Typed read of window._env_, mounted by the platform's /env-config.js at
// request time. Declares only the keys this app actually has: the four SPA
// keys of its `user-auth` auth dependency (thunder-authentication) — NOT
// USER_AUTH_JWKS_URL, which only the API gateway ever validates against.
// There is no sibling API URL key: hotel-api is reached same-origin at /api.

type Env = {
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
