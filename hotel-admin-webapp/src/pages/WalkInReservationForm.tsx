import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";

type Property = components["schemas"]["Property"];
type RoomType = components["schemas"]["RoomType"];

export function WalkInReservationFormPage(): JSX.Element {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hotelApi.GET("/properties", { params: { query: {} } }).then(({ data }) => {
      setProperties(data?.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!propertyId) {
      setRoomTypes([]);
      return;
    }
    void hotelApi
      .GET("/properties/{propertyId}/room-types", {
        params: { path: { propertyId }, query: {} },
      })
      .then(({ data }) => setRoomTypes(data?.data ?? []));
  }, [propertyId]);

  async function handleCreate(): Promise<void> {
    setSaving(true);
    setError(null);
    const { data, error: err } = await hotelApi.POST("/reservations", {
      body: {
        propertyId,
        roomTypeId,
        checkIn,
        checkOut,
        guestName,
        guestPhone,
      },
    });
    setSaving(false);
    if (err || !data) {
      setError("Could not create the reservation. Check the room's availability and dates.");
      return;
    }
    navigate(`/reservations/${data.id}`);
  }

  const canSubmit =
    propertyId && roomTypeId && checkIn && checkOut && guestName && !saving;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/reservations")}>
          Back
        </PageTitle.BackButton>
        <PageTitle.Header>New reservation</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Form.Section>
        <Form.Stack>
          <TextField
            select
            label="Property"
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setRoomTypeId("");
            }}
          >
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Room Type"
            value={roomTypeId}
            disabled={!propertyId}
            onChange={(e) => setRoomTypeId(e.target.value)}
          >
            {roomTypes.map((rt) => (
              <MenuItem key={rt.id} value={rt.id}>
                {rt.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Check-in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Check-out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Guest name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <TextField
            label="Guest phone"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
          />
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/reservations")}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleCreate}>
          Create Reservation
        </Button>
      </Stack>
    </PageContent>
  );
}
