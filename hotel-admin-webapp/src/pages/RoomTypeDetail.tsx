import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { BarChart } from "@wso2/oxygen-ui-charts-react";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";

type RoomType = components["schemas"]["RoomType"];
type RatePlan = components["schemas"]["RatePlan"];
type AvailabilityDay = components["schemas"]["AvailabilityDay"];

export function RoomTypeDetailPage(): JSX.Element {
  const { propertyId, roomTypeId } = useParams<{ propertyId: string; roomTypeId: string }>();
  const navigate = useNavigate();
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [ratePlans, setRatePlans] = useState<RatePlan[] | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId || !roomTypeId) return;
    let live = true;

    // No single-room-type GET exists in the contract — resolve the row this
    // screen shows from the property's room-type list, the same list
    // PropertyDetail's table already reads.
    void hotelApi
      .GET("/properties/{propertyId}/room-types", { params: { path: { propertyId }, query: {} } })
      .then(({ data, error: err }) => {
        if (!live) return;
        if (err) {
          setError("Could not load this room type.");
          return;
        }
        setRoomType(data?.data.find((rt) => rt.id === roomTypeId) ?? null);
      });

    void hotelApi
      .GET("/room-types/{roomTypeId}/rate-plans", { params: { path: { roomTypeId } } })
      .then(({ data, error: err }) => {
        if (live && !err) setRatePlans(data?.data ?? []);
      });

    void hotelApi
      .GET("/room-types/{roomTypeId}/availability", {
        params: { path: { roomTypeId }, query: {} },
      })
      .then(({ data, error: err }) => {
        if (live && !err) setAvailability(data ?? []);
      });

    return () => {
      live = false;
    };
  }, [propertyId, roomTypeId]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate(`/properties/${propertyId}`)}>
          Back
        </PageTitle.BackButton>
        <PageTitle.Header>{roomType?.name ?? "Room type"}</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Card sx={{ mb: 3, maxWidth: 320 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Base rate
          </Typography>
          <Typography variant="h4">
            {roomType ? roomType.baseRate.toFixed(2) : "…"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            per night
          </Typography>
        </CardContent>
      </Card>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Start</ListingTable.Cell>
              <ListingTable.Cell>End</ListingTable.Cell>
              <ListingTable.Cell>Rate</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(ratePlans ?? []).map((rp) => (
              <ListingTable.Row key={rp.id}>
                <ListingTable.Cell>{rp.startDate}</ListingTable.Cell>
                <ListingTable.Cell>{rp.endDate}</ListingTable.Cell>
                <ListingTable.Cell>{rp.rate.toFixed(2)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {ratePlans?.length === 0 && (
          <ListingTable.EmptyState
            title="No rate plans"
            description="This room type has no date-based rate plans yet."
          />
        )}
      </ListingTable.Container>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Availability calendar
      </Typography>
      <Card>
        <CardContent>
          <BarChart
            data={(availability ?? []).map((d) => ({ date: d.date, rooms: d.roomsAvailable }))}
            xAxisDataKey="date"
            height={220}
            width="100%"
            bars={[{ dataKey: "rooms", name: "Rooms available" }]}
          />
        </CardContent>
      </Card>
    </PageContent>
  );
}
