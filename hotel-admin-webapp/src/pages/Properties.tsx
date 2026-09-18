import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type Property = components["schemas"]["Property"];

export function PropertiesPage(): JSX.Element {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [roomTypeCounts, setRoomTypeCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void hotelApi.GET("/properties", { params: { query: {} } }).then(async ({ data, error: err }) => {
      if (!live) return;
      if (err) {
        setError("Could not load properties.");
        return;
      }
      const list = data?.data ?? [];
      setProperties(list);
      // "Room Types" column isn't on Property — filled from one
      // listRoomTypes request per property (no bulk endpoint covers it).
      const counts: Record<string, number> = {};
      await Promise.all(
        list.map(async (p) => {
          const res = await hotelApi.GET("/properties/{propertyId}/room-types", {
            params: { path: { propertyId: p.id }, query: {} },
          });
          counts[p.id] = res.data?.count ?? res.data?.data?.length ?? 0;
        }),
      );
      if (live) setRoomTypeCounts(counts);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Properties</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /properties">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/properties/new")}
            >
              New Property
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Name</ListingTable.Cell>
              <ListingTable.Cell>Currency</ListingTable.Cell>
              <ListingTable.Cell>Room Types</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(properties ?? []).map((p) => (
              <ListingTable.Row
                key={p.id}
                clickable
                onClick={() => navigate(`/properties/${p.id}`)}
              >
                <ListingTable.Cell>{p.name}</ListingTable.Cell>
                <ListingTable.Cell>{p.currency}</ListingTable.Cell>
                <ListingTable.Cell>{roomTypeCounts[p.id] ?? "…"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {properties?.length === 0 && (
          <ListingTable.EmptyState
            title="No properties yet"
            description="Create your first property to start configuring room types and rates."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
