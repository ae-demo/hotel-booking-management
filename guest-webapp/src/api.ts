// Typed client for hotel-api (the one component-kind dependency this app
// calls), generated from its committed openapi.yaml. Same-origin baseUrl:
// nginx strips /api before proxying to the sibling through the API gateway.
//
// Authorization is entirely src/authz/client.ts's: this middleware attaches
// the bearer and applies the 401 rule, and adds NOTHING of its own.
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/hotel-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

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

export const hotelApi = createClient<paths>({ baseUrl: "/api" });
hotelApi.use(authMiddleware);
