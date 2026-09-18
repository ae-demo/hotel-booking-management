// Typed read of window._env_, mounted by the platform at /env-config.js. Never
// build-time (import.meta.env.VITE_*) — the platform delivers config at
// request time. Declare only keys this app actually has: the `user-auth`
// platform-resource dependency's four browser-facing OIDC keys. There is no
// browser key for the hotel-api sibling — it is reached same-origin at /api.
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
