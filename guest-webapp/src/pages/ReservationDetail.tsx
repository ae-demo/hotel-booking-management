// wireframes.dsl: screen ReservationDetail "One reservation, with cancel" —
// property, room type, dates, status badge and a danger "Cancel Reservation"
// button. hotel-api has no GET /me/reservations/{id}, so this reads the
// caller's own list (GET /me/reservations, reservations:read) and finds the
// row by id — a row that is not there is simply not in the caller's
// collection (404-shaped empty state), never a 403.
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  PageContent,
  PageTitle,
  Skeleton,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { Can } from "../authz/gates";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { statusColor, statusLabel } from "../lib/reservation";

type Reservation = components["schemas"]["Reservation"];

export function ReservationDetailPage(): ReactElement {
  const { reservationId = "" } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined);
  const [propertyName, setPropertyName] = useState<string>("");
  const [roomTypeName, setRoomTypeName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load(): Promise<void> {
    const { data, error: err } = await hotelApi.GET("/me/reservations", {
      params: { query: { limit: 100 } },
    });
    if (err) {
      setError("Could not load this reservation.");
      setReservation(null);
      return;
    }
    const found = data.data.find((r) => r.id === reservationId) ?? null;
    setReservation(found);
    if (!found) return;

    const [propertyRes, roomTypesRes] = await Promise.all([
      hotelApi.GET("/properties/{propertyId}", { params: { path: { propertyId: found.propertyId } } }),
      hotelApi.GET("/properties/{propertyId}/room-types", {
        params: { path: { propertyId: found.propertyId }, query: { limit: 100 } },
      }),
    ]);
    if (!propertyRes.error) setPropertyName(propertyRes.data.name);
    if (!roomTypesRes.error) {
      setRoomTypeName(roomTypesRes.data.data.find((rt) => rt.id === found.roomTypeId)?.name ?? "");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  async function handleCancel(): Promise<void> {
    setCancelling(true);
    setError(null);
    const { error: err } = await hotelApi.POST("/me/reservations/{reservationId}/cancel", {
      params: { path: { reservationId } },
    });
    setCancelling(false);
    if (err) {
      setError("Could not cancel this reservation. Please try again.");
      return;
    }
    await load();
  }

  if (reservation === undefined) {
    return (
      <PageContent>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
      </PageContent>
    );
  }

  if (!reservation) {
    return (
      <PageContent>
        <Alert severity="warning">
          That reservation was not found in your account.{" "}
          <Button variant="text" onClick={() => navigate("/reservations")}>
            Back to my reservations
          </Button>
        </Alert>
      </PageContent>
    );
  }

  const cancellable = reservation.status === "pending" || reservation.status === "confirmed";

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/reservations")} />
        <PageTitle.Header>{propertyName || reservation.propertyId}</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack spacing={1.5}>
        <Typography>
          {roomTypeName || reservation.roomTypeId} · {reservation.checkIn} - {reservation.checkOut}
        </Typography>
        <Chip
          label={statusLabel(reservation.status)}
          color={statusColor(reservation.status)}
          size="small"
          sx={{ width: "fit-content" }}
        />
        {cancellable ? (
          <Can op="POST /me/reservations/{reservationId}/cancel">
            <Stack direction="row" justifyContent="flex-end" sx={{ pt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => void handleCancel()}
                disabled={cancelling}
              >
                Cancel Reservation
              </Button>
            </Stack>
          </Can>
        ) : null}
      </Stack>
    </PageContent>
  );
}
