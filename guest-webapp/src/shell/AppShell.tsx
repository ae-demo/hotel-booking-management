// The app chrome every screen renders inside — public and signed-in-gated
// screens alike, because the wireframes draw the same navbar + sidebar on
// every screen including Home/SearchResults/RoomDetail. Search and My
// Reservations are always shown in the sidebar (never hidden behind <Can>):
// clicking "My Reservations" while signed out is exactly how a visitor is
// meant to discover sign-in, per the issue's acceptance criteria.
import { type ReactElement } from "react";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Button,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { CalendarCheck, Search } from "@wso2/oxygen-ui-icons-react";
import { useAuthz } from "../authz/gates";
import { signIn, signOut } from "../authz/session";
import { APP_NAME } from "../appName";

function activeItemFor(pathname: string): string {
  if (
    pathname.startsWith("/reservations") ||
    pathname === "/checkout" ||
    pathname === "/confirmation"
  ) {
    return "reservations";
  }
  return "home";
}

export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signedIn, username } = useAuthz();
  const active = activeItemFor(pathname);

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand onClick={() => navigate("/")}>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            {signedIn ? (
              <UserMenu>
                <UserMenu.Trigger name={username || "Guest"} />
                <UserMenu.Header name={username || "Guest"} email={username} />
                <UserMenu.Item
                  icon={<CalendarCheck />}
                  label="My Reservations"
                  onClick={() => navigate("/reservations")}
                />
                <UserMenu.Divider />
                <UserMenu.Logout onClick={() => void signOut()} />
              </UserMenu>
            ) : (
              <Button variant="outlined" onClick={() => void signIn()}>
                Sign In
              </Button>
            )}
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              <Sidebar.Item id="home" link={<RouterLink to="/" />}>
                <Sidebar.ItemIcon>
                  <Search />
                </Sidebar.ItemIcon>
                <Sidebar.ItemLabel>Search</Sidebar.ItemLabel>
              </Sidebar.Item>
              <Sidebar.Item id="reservations" link={<RouterLink to="/reservations" />}>
                <Sidebar.ItemIcon>
                  <CalendarCheck />
                </Sidebar.ItemIcon>
                <Sidebar.ItemLabel>My Reservations</Sidebar.ItemLabel>
              </Sidebar.Item>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© {APP_NAME}</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
