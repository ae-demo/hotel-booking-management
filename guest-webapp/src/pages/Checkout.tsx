// wireframes.dsl: screen Checkout "Guest details and online payment" — guest
// details, a WhatsApp opt-in, the total due, and a primary "Pay and Book"
// that charges the guest via hotel-api's POST /me/reservations (which itself
// calls payment-service — never called directly from the browser) and leads
// to BookingConfirmation. Gated: reachable only signed in, on
// reservations:create.
import { useState, type FormEvent, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { formatMoney } from "../lib/hotel";
import type { BookingConfirmationState } from "./BookingConfirmation";

type RoomType = components["schemas"]["RoomType"];
type Property = components["schemas"]["Property"];

export interface CheckoutState {
  roomType: RoomType;
  property: Property;
  checkIn: string;
  checkOut: string;
  guests: string;
  nights: number;
  total: number;
}

export function CheckoutPage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) {
    return (
      <PageContent>
        <Alert severity="warning">
          Nothing to check out yet — start from{" "}
          <Button variant="text" onClick={() => navigate("/")}>
            search
          </Button>
          .
        </Alert>
      </PageContent>
    );
  }

  const { roomType, property, checkIn, checkOut, nights, total } = state;

  async function handlePay(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: apiError, response } = await hotelApi.POST("/me/reservations", {
      body: {
        propertyId: property.id,
        roomTypeId: roomType.id,
        checkIn,
        checkOut,
        guestName,
        guestEmail,
        guestPhone,
        whatsappOptIn,
      },
    });
    setSubmitting(false);
    if (apiError || !data) {
      setError(
        response.status === 402
          ? "Payment declined. Please check your payment details and try again."
          : "This room could not be booked — it may no longer be available.",
      );
      return;
    }
    const confirmationState: BookingConfirmationState = {
      reservation: data,
      roomTypeName: roomType.name,
      propertyName: property.name,
    };
    navigate("/confirmation", { state: confirmationState });
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Confirm and pay</PageTitle.Header>
        <PageTitle.SubHeader>
          {roomType.name} · {property.name} · {checkIn} to {checkOut}
        </PageTitle.SubHeader>
      </PageTitle>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack component="form" onSubmit={handlePay} spacing={2} sx={{ maxWidth: 480 }}>
        <TextField
          label="Full name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
        />
        <TextField
          type="email"
          label="Email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          required
        />
        <TextField
          label="Phone"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          required
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
            />
          }
          label="Also notify me on WhatsApp"
        />
        <Divider />
        <Typography variant="h6">
          Total due: {formatMoney(total, property.currency)} ({nights} night{nights > 1 ? "s" : ""})
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Pay and Book
          </Button>
        </Stack>
      </Stack>
    </PageContent>
  );
}
