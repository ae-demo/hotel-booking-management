import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type Reservation = components["schemas"]["Reservation"];
type Property = components["schemas"]["Property"];
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

export function ReservationsQueuePage(): JSX.Element {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [roomTypes, setRoomTypes] = useState<Record<string, RoomType>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void hotelApi.GET("/reservations", { params: { query: {} } }).then(async ({ data, error: err }) => {
      if (!live) return;
      if (err) {
        setError("Could not load reservations.");
        return;
      }
      const list = data?.data ?? [];
      setReservations(list);
      // "Room Type" column: joined on id from each distinct property's
      // room-type list (no bulk room-type-by-id lookup exists).
      const propertyIds = [...new Set(list.map((r) => r.propertyId))];
      const map: Record<string, RoomType> = {};
      await Promise.all(
        propertyIds.map(async (propertyId) => {
          const res = await hotelApi.GET("/properties/{propertyId}/room-types", {
            params: { path: { propertyId }, query: {} },
          });
          for (const rt of res.data?.data ?? []) map[rt.id] = rt;
        }),
      );
      if (live) setRoomTypes(map);
    });
    return () => {
      live = false;
    };
  }, []);

  function roomTypeName(id: string): string {
    return roomTypes[id]?.name ?? id;
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Reservations</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /reservations">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/reservations/new")}
            >
              New Walk-in Reservation
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Guest</ListingTable.Cell>
              <ListingTable.Cell>Room Type</ListingTable.Cell>
              <ListingTable.Cell>Dates</ListingTable.Cell>
              <ListingTable.Cell>Source</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(reservations ?? []).map((r) => (
              <ListingTable.Row
                key={r.id}
                clickable
                onClick={() => navigate(`/reservations/${r.id}`)}
              >
                <ListingTable.Cell>{r.guestId ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{roomTypeName(r.roomTypeId)}</ListingTable.Cell>
                <ListingTable.Cell>
                  {r.checkIn} - {r.checkOut}
                </ListingTable.Cell>
                <ListingTable.Cell>{r.channelName ?? SOURCE_LABEL[r.source]}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={r.status} color={STATUS_COLOR[r.status]} size="small" />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {reservations?.length === 0 && (
          <ListingTable.EmptyState
            title="No reservations yet"
            description="Reservations from every source — direct, front desk and channels — appear here."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
