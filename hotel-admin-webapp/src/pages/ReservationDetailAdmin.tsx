import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Chip, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type Reservation = components["schemas"]["Reservation"];
type RoomType = components["schemas"]["RoomType"];

const STATUS_COLOR: Record<Reservation["status"], "default" | "success" | "warning" | "error"> = {
  pending: "warning",
  confirmed: "success",
  "checked-in": "success",
  "checked-out": "default",
  cancelled: "error",
};

const SOURCE_LABEL: Record<Reservation["source"], string> = {
  direct: "Direct",
  "front-desk": "Front Desk",
  channel: "Channel",
};

export function ReservationDetailAdminPage(): JSX.Element {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reservationId) return;
    void load();
  }, [reservationId]);

  async function load(): Promise<void> {
    if (!reservationId) return;
    const { data, error: err } = await hotelApi.GET("/reservations/{reservationId}", {
      params: { path: { reservationId } },
    });
    if (err || !data) {
      setError("Could not load this reservation.");
      return;
    }
    setReservation(data);
    const rtRes = await hotelApi.GET("/properties/{propertyId}/room-types", {
      params: { path: { propertyId: data.propertyId }, query: {} },
    });
    setRoomType(rtRes.data?.data.find((rt) => rt.id === data.roomTypeId) ?? null);
  }

  async function handleCheckIn(): Promise<void> {
    if (!reservationId) return;
    setBusy(true);
    const { error: err } = await hotelApi.POST("/reservations/{reservationId}/check-in", {
      params: { path: { reservationId } },
    });
    setBusy(false);
    if (!err) void load();
    else setError("Could not check in this guest.");
  }

  async function handleCheckOut(): Promise<void> {
    if (!reservationId) return;
    setBusy(true);
    const { error: err } = await hotelApi.POST("/reservations/{reservationId}/check-out", {
      params: { path: { reservationId } },
    });
    setBusy(false);
    if (!err) void load();
    else setError("Could not check out this guest.");
  }

  async function handleCancel(): Promise<void> {
    if (!reservationId) return;
    setBusy(true);
    const { error: err } = await hotelApi.POST("/reservations/{reservationId}/cancel", {
      params: { path: { reservationId } },
    });
    setBusy(false);
    if (!err) void load();
    else setError("Could not cancel this reservation.");
  }

  const title = reservation
    ? `${reservation.guestId ?? "Guest"} — ${roomType?.name ?? reservation.roomTypeId}`
    : "Reservation";

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/reservations")}>
          Back
        </PageTitle.BackButton>
        <PageTitle.Header>{title}</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      {reservation && (
        <>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {reservation.checkIn} - {reservation.checkOut} · Source:{" "}
            {reservation.channelName ?? SOURCE_LABEL[reservation.source]}
          </Typography>
          <Chip
            label={reservation.status}
            color={STATUS_COLOR[reservation.status]}
            sx={{ mb: 3 }}
          />

          <Stack direction="row" spacing={2}>
            <Can op="POST /reservations/{reservationId}/check-in">
              <Button
                variant="contained"
                disabled={busy || reservation.status !== "confirmed"}
                onClick={handleCheckIn}
              >
                Check In
              </Button>
            </Can>
            <Can op="POST /reservations/{reservationId}/check-out">
              <Button
                variant="outlined"
                disabled={busy || reservation.status !== "checked-in"}
                onClick={handleCheckOut}
              >
                Check Out
              </Button>
            </Can>
            <Stack direction="row" sx={{ flexGrow: 1 }} justifyContent="flex-end">
              <Can op="POST /reservations/{reservationId}/cancel">
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy || reservation.status === "cancelled" || reservation.status === "checked-out"}
                  onClick={handleCancel}
                >
                  Cancel Reservation
                </Button>
              </Can>
            </Stack>
          </Stack>
        </>
      )}
    </PageContent>
  );
}
