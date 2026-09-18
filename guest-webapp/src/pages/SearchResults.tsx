// wireframes.dsl: screen SearchResults "Room types matching the search" — a
// table of Room Type | Property | Rate/night | Occupancy, each row leading to
// RoomDetail. Public: GET /properties/{propertyId}/room-types is
// `security: []` ("public, for guest search").
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, PageContent, PageTitle, Skeleton, Typography } from "@wso2/oxygen-ui";
import { ListingTable } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { formatMoney, nightsBetween } from "../lib/hotel";

type RoomType = components["schemas"]["RoomType"];
type Property = components["schemas"]["Property"];

export function SearchResultsPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get("propertyId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = searchParams.get("guests") ?? "";

  const [property, setProperty] = useState<Property | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setError("No property selected. Go back and search again.");
      setRoomTypes([]);
      return;
    }
    let live = true;
    void (async () => {
      const [propertyRes, roomTypesRes] = await Promise.all([
        hotelApi.GET("/properties/{propertyId}", { params: { path: { propertyId } } }),
        hotelApi.GET("/properties/{propertyId}/room-types", {
          params: {
            path: { propertyId },
            query: {
              checkIn: checkIn || undefined,
              checkOut: checkOut || undefined,
              guests: guests ? Number(guests) : undefined,
              limit: 100,
            },
          },
        }),
      ]);
      if (!live) return;
      if (propertyRes.error || roomTypesRes.error) {
        setError("Could not load available rooms. Please try your search again.");
        return;
      }
      setProperty(propertyRes.data);
      setRoomTypes(roomTypesRes.data.data);
    })();
    return () => {
      live = false;
    };
  }, [propertyId, checkIn, checkOut, guests]);

  function openRoom(roomType: RoomType): void {
    const params = new URLSearchParams({ propertyId, checkIn, checkOut, guests });
    navigate(`/rooms/${roomType.id}?${params.toString()}`);
  }

  const nights = nightsBetween(checkIn, checkOut);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Available rooms</PageTitle.Header>
        <PageTitle.SubHeader>
          {property ? property.name : ""}
          {checkIn && checkOut ? ` · ${checkIn} to ${checkOut}` : ""}
          {guests ? ` · ${guests} guest(s)` : ""}
        </PageTitle.SubHeader>
      </PageTitle>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {roomTypes === null ? (
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
      ) : (
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Room Type</ListingTable.Cell>
                <ListingTable.Cell>Property</ListingTable.Cell>
                <ListingTable.Cell>Rate/night</ListingTable.Cell>
                <ListingTable.Cell>Occupancy</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {roomTypes.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={4}>
                    <Typography color="text.secondary">
                      No room types have availability for that search.
                    </Typography>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                roomTypes.map((roomType) => (
                  <ListingTable.Row key={roomType.id} clickable onClick={() => openRoom(roomType)}>
                    <ListingTable.Cell>{roomType.name}</ListingTable.Cell>
                    <ListingTable.Cell>{property?.name ?? ""}</ListingTable.Cell>
                    <ListingTable.Cell>{formatMoney(roomType.baseRate, property?.currency)}</ListingTable.Cell>
                    <ListingTable.Cell>{roomType.occupancy}</ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
      {nights > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {nights} night{nights > 1 ? "s" : ""} stay
        </Typography>
      ) : null}
    </PageContent>
  );
}
