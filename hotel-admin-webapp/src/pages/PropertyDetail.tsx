import { useEffect, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type Property = components["schemas"]["Property"];
type RoomType = components["schemas"]["RoomType"];

export function PropertyDetailPage(): JSX.Element {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    let live = true;
    void hotelApi
      .GET("/properties/{propertyId}", { params: { path: { propertyId } } })
      .then(({ data, error: err }) => {
        if (!live) return;
        if (err) setError("Could not load this property.");
        else setProperty(data ?? null);
      });
    void hotelApi
      .GET("/properties/{propertyId}/room-types", { params: { path: { propertyId }, query: {} } })
      .then(({ data, error: err }) => {
        if (!live) return;
        if (!err) setRoomTypes(data?.data ?? []);
      });
    return () => {
      live = false;
    };
  }, [propertyId]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/properties")}>Back</PageTitle.BackButton>
        <PageTitle.Header>{property?.name ?? "Property"}</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /properties/{propertyId}/room-types">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate(`/properties/${propertyId}/room-types/new`)}
            >
              New Room Type
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Room Type</ListingTable.Cell>
              <ListingTable.Cell>Occupancy</ListingTable.Cell>
              <ListingTable.Cell>Base Rate</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(roomTypes ?? []).map((rt) => (
              <ListingTable.Row
                key={rt.id}
                clickable
                onClick={() => navigate(`/properties/${propertyId}/room-types/${rt.id}`)}
              >
                <ListingTable.Cell>{rt.name}</ListingTable.Cell>
                <ListingTable.Cell>{rt.occupancy}</ListingTable.Cell>
                <ListingTable.Cell>{rt.baseRate.toFixed(2)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {roomTypes?.length === 0 && (
          <ListingTable.EmptyState
            title="No room types yet"
            description="Add a room type to start taking reservations for this property."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
