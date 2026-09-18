// wireframes.dsl: screen BookingConfirmation "Booking confirmed" — a card
// with the reservation reference and a "View My Reservations" button. No API
// call of its own: it renders the reservation Checkout's POST just returned,
// carried in router state, so `loads: null` in src/authz/screens.ts (any
// signed-in caller — reaching this page at all means checkout just succeeded).
import { type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, CardContent, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import type { components } from "../generated/hotel-api";

type Reservation = components["schemas"]["Reservation"];

export interface BookingConfirmationState {
  reservation: Reservation;
  roomTypeName: string;
  propertyName: string;
}

export function BookingConfirmationPage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BookingConfirmationState | null;

  if (!state) {
    return (
      <PageContent>
        <Alert severity="info">
          Nothing to confirm here.{" "}
          <Button variant="text" onClick={() => navigate("/reservations")}>
            View my reservations
          </Button>
        </Alert>
      </PageContent>
    );
  }

  const { reservation, roomTypeName, propertyName } = state;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>You're booked!</PageTitle.Header>
        <PageTitle.SubHeader>A confirmation has been emailed to you.</PageTitle.SubHeader>
      </PageTitle>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Reservation
          </Typography>
          <Typography variant="h5" sx={{ mb: 1 }}>
            {reservation.id}
          </Typography>
          <Stack spacing={0.5}>
            <Typography>
              {roomTypeName}, {propertyName}
            </Typography>
            <Typography color="text.secondary">
              Check-in {reservation.checkIn} · Check-out {reservation.checkOut}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" sx={{ mt: 3 }}>
        {/* wireframes.dsl draws this button with no `primary` marker. */}
        <Button variant="outlined" onClick={() => navigate("/reservations")}>
          View My Reservations
        </Button>
      </Stack>
    </PageContent>
  );
}
