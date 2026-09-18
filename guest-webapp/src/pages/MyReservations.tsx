// wireframes.dsl: screen MyReservations "The guest's own upcoming
// reservations" — Property | Dates | Status, each row leading to
// ReservationDetail. Gated: GET /me/reservations (reservations:read) resolves
// through the caller's own sub, so this can only ever show the signed-in
// guest's rows.
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Chip, ListingTable, PageContent, PageTitle, Skeleton, Typography } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { statusColor, statusLabel } from "../lib/reservation";

type Reservation = components["schemas"]["Reservation"];
type Property = components["schemas"]["Property"];

export function MyReservationsPage(): ReactElement {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [propertiesById, setPropertiesById] = useState<Record<string, Property>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      // One request each for the reservation list and the property directory —
      // never one property fetch per row — then joined on propertyId here.
      const [reservationsRes, propertiesRes] = await Promise.all([
        hotelApi.GET("/me/reservations", { params: { query: { limit: 100 } } }),
        hotelApi.GET("/properties", { params: { query: { limit: 100 } } }),
      ]);
      if (!live) return;
      if (reservationsRes.error || propertiesRes.error) {
        setError("Could not load your reservations.");
        return;
      }
      setReservations(reservationsRes.data.data);
      setPropertiesById(Object.fromEntries(propertiesRes.data.data.map((p) => [p.id, p])));
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My reservations</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {reservations === null ? (
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
      ) : (
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Property</ListingTable.Cell>
                <ListingTable.Cell>Dates</ListingTable.Cell>
                <ListingTable.Cell>Status</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {reservations.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={3}>
                    <Typography color="text.secondary">
                      You have no reservations yet — search for a room to book one.
                    </Typography>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                reservations.map((reservation) => (
                  <ListingTable.Row
                    key={reservation.id}
                    clickable
                    onClick={() => navigate(`/reservations/${reservation.id}`)}
                  >
                    <ListingTable.Cell>
                      {propertiesById[reservation.propertyId]?.name ?? reservation.propertyId}
                    </ListingTable.Cell>
                    <ListingTable.Cell>
                      {reservation.checkIn} - {reservation.checkOut}
                    </ListingTable.Cell>
                    <ListingTable.Cell>
                      <Chip
                        label={statusLabel(reservation.status)}
                        color={statusColor(reservation.status)}
                        size="small"
                      />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
    </PageContent>
  );
}
