// Same-origin client against hotel-api, the sole dependency this app calls.
// nginx strips /api before proxying (see nginx/default.conf), so OpenAPI paths
// stay exactly as the contract spells them.
//
// No authorization logic of its own: the middleware attaches the bearer and
// classifies the response through src/authz/client.ts, which is the ONE
// module that decides what a 401 means (Forbidden vs. sign-in again).
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/hotel-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

export const hotelApi = createClient<paths>({ baseUrl: "/api" });

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

hotelApi.use(authMiddleware);
