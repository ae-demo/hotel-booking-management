// ROUTING STRUCTURE — adapted from thunder-authentication's App.example.tsx.
//
// This app splits from the stock pattern in one deliberate way: Home,
// SearchResults and RoomDetail load hotel-api operations that are themselves
// `security: []` ("public, for guest search"), and the issue's acceptance
// criteria are explicit that a guest may search with no sign-in — so those
// three screens are `public: true` in src/authz/screens.ts AND share the same
// AppShell (navbar + sidebar) as every other screen, per wireframes.dsl,
// which draws that chrome on every screen including Home. That is different
// from the stock example, where a public screen "loses the shell" — there is
// no shell to lose here, because this app's shell carries no
// sign-in-specific chrome of its own (the header shows "Sign In" instead of
// a user menu when signed out).
//
// Checkout, BookingConfirmation, MyReservations and ReservationDetail are
// NOT public: reaching any of them with no session forces a Thunder sign-in
// redirect, exactly as the issue's acceptance criteria require. That is the
// stock SignedIn() behaviour, applied only to this subset of paths rather
// than to everything outside the public list.
import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { HomePage } from "./pages/Home";
import { SearchResultsPage } from "./pages/SearchResults";
import { RoomDetailPage } from "./pages/RoomDetail";
import { CheckoutPage } from "./pages/Checkout";
import { BookingConfirmationPage } from "./pages/BookingConfirmation";
import { MyReservationsPage } from "./pages/MyReservations";
import { ReservationDetailPage } from "./pages/ReservationDetail";
import { Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";

/** Paths that require a session at all — Checkout/MyReservations/ReservationDetail/BookingConfirmation. */
const GATED_PATHS = ["/checkout", "/confirmation", "/reservations"];

function isGatedPath(pathname: string): boolean {
  return GATED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <RootRoutes />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside
 * the router and above every route.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress />
        <Typography color="text.secondary">{APP_NAME}</Typography>
      </Stack>
    </Box>
  );
}

function RootRoutes(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();
  const { pathname } = useLocation();
  const gated = isGatedPath(pathname);

  // Only a GATED path forces sign-in on load. A visitor browsing Home,
  // SearchResults or RoomDetail is never redirected — that is the whole
  // point of those three screens being public.
  useEffect(() => {
    if (!signedIn && gated) void signIn();
  }, [signedIn, gated]);

  if (!signedIn && gated) return <Splash />;

  // NoAccess replaces the shell only for a signed-in caller who reached the
  // gated area holding none of the project's scopes — never for anonymous
  // browsing of the public screens, which needs no scope at all.
  if (signedIn && gated && !hasScopedReach(scopes, signedIn)) {
    return <NoAccess appName={APP_NAME} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/rooms/:roomTypeId" element={<RoomDetailPage />} />

        <Route element={<RequireOperation op="POST /me/reservations" screen="Checkout" />}>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>
        <Route path="/confirmation" element={<BookingConfirmationPage />} />
        <Route element={<RequireOperation op="GET /me/reservations" screen="My Reservations" />}>
          <Route path="/reservations" element={<MyReservationsPage />} />
        </Route>
        <Route element={<RequireOperation op="GET /me/reservations" screen="Reservation Detail" />}>
          <Route path="/reservations/:reservationId" element={<ReservationDetailPage />} />
        </Route>

        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
