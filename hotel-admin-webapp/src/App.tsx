// Adapted from thunder-authentication's App.example.tsx pattern. The ROUTING
// STRUCTURE is prescribed: NoAccess sits ABOVE the shell route and REPLACES
// it; Forbidden sits INSIDE the shell; /forbidden is wired into authz/client
// once, from here; every gated route is wrapped in <RequireOperation>, with
// the operation taken from SCREEN_ROUTES.
//
// No `public` screens here: every one of hotel-admin-webapp's screens sits in
// a role-bearing flow (F1 HotelManager, F2 FrontDeskAgent, F3 ChannelOperator)
// per wireframes.dsl, so all of them are signed-in-only.

import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthzProvider, Forbidden, NoAccess, RequireOperation, useAuthz, useScopes } from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { APP_NAME } from "./appName";
import { AppShell } from "./shell/AppShell";
import { CallbackPage } from "./pages/Callback";
import { ManagerDashboardPage } from "./pages/ManagerDashboard";
import { PropertiesPage } from "./pages/Properties";
import { PropertyFormPage } from "./pages/PropertyForm";
import { PropertyDetailPage } from "./pages/PropertyDetail";
import { RoomTypeFormPage } from "./pages/RoomTypeForm";
import { RoomTypeDetailPage } from "./pages/RoomTypeDetail";
import { StaffAccountsPage } from "./pages/StaffAccounts";
import { StaffAccountFormPage } from "./pages/StaffAccountForm";
import { ReportsPage } from "./pages/Reports";
import { ReservationsQueuePage } from "./pages/ReservationsQueue";
import { WalkInReservationFormPage } from "./pages/WalkInReservationForm";
import { ReservationDetailAdminPage } from "./pages/ReservationDetailAdmin";
import { ChannelConnectionsPage } from "./pages/ChannelConnections";
import { ChannelConnectionFormPage } from "./pages/ChannelConnectionForm";
import { ChannelConnectionDetailPage } from "./pages/ChannelConnectionDetail";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  dashboard: <ManagerDashboardPage />,
  properties: <PropertiesPage />,
  propertyNew: <PropertyFormPage />,
  propertyDetail: <PropertyDetailPage />,
  roomTypeNew: <RoomTypeFormPage />,
  roomTypeDetail: <RoomTypeDetailPage />,
  staff: <StaffAccountsPage />,
  staffNew: <StaffAccountFormPage />,
  staffEdit: <StaffAccountFormPage />,
  reports: <ReportsPage />,
  reservations: <ReservationsQueuePage />,
  reservationNew: <WalkInReservationFormPage />,
  reservationDetail: <ReservationDetailAdminPage />,
  channels: <ChannelConnectionsPage />,
  channelNew: <ChannelConnectionFormPage />,
  channelDetail: <ChannelConnectionDetailPage />,
};

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
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Checking your session…</p>
    </main>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
