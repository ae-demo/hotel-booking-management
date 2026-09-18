import type { JSX } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  Link2,
  LogOut,
  Users,
} from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { signOut } from "../authz/session";

/** One name per sidebar item — the `id` Sidebar.activeItem compares against. */
type NavKey = "dashboard" | "properties" | "staff" | "reports" | "reservations" | "channels";

function activeNavKey(pathname: string): NavKey | undefined {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/properties")) return "properties";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/reservations")) return "reservations";
  if (pathname.startsWith("/channels")) return "channels";
  return undefined;
}

/**
 * ONE rail, every item wrapped in <Can>, so a caller holding two roles sees
 * the union and each role sees only its own sections — the wireframes draw a
 * different sidebar per flow because they draw one role at a time.
 */
export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { username } = useAuthz();
  const roles = useHeldRoles();
  const active = activeNavKey(pathname);
  const displayName = username || "Signed in";

  async function handleSignOut(): Promise<void> {
    await signOut();
  }

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand onClick={() => navigate("/dashboard")}>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={displayName} showName />
              <UserMenu.Header
                name={displayName}
                email={roles.length > 0 ? roles.join(", ") : "No role"}
                role={roles[0]}
              />
              <UserMenu.Logout icon={<LogOut size={18} />} onClick={handleSignOut} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              <Can op="GET /reports/bookings">
                <Sidebar.Item id="dashboard" link={<Link to="/dashboard" />}>
                  <Sidebar.ItemIcon>
                    <LayoutDashboard />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Dashboard</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
              <Can op="GET /properties">
                <Sidebar.Item id="properties" link={<Link to="/properties" />}>
                  <Sidebar.ItemIcon>
                    <Building2 />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Properties</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
              <Can op="GET /staff-accounts">
                <Sidebar.Item id="staff" link={<Link to="/staff" />}>
                  <Sidebar.ItemIcon>
                    <Users />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Staff</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
              <Can op="GET /reports/revenue">
                <Sidebar.Item id="reports" link={<Link to="/reports" />}>
                  <Sidebar.ItemIcon>
                    <BarChart3 />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Reports</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
              <Can op="GET /reservations">
                <Sidebar.Item id="reservations" link={<Link to="/reservations" />}>
                  <Sidebar.ItemIcon>
                    <CalendarCheck />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Reservations</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
              <Can op="GET /channel-connections">
                <Sidebar.Item id="channels" link={<Link to="/channels" />}>
                  <Sidebar.ItemIcon>
                    <Link2 />
                  </Sidebar.ItemIcon>
                  <Sidebar.ItemLabel>Channels</Sidebar.ItemLabel>
                </Sidebar.Item>
              </Can>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
