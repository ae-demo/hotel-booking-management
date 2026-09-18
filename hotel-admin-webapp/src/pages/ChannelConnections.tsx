import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type ChannelConnection = components["schemas"]["ChannelConnection"];
type Property = components["schemas"]["Property"];

const STATUS_COLOR: Record<ChannelConnection["status"], "success" | "default" | "error"> = {
  connected: "success",
  disconnected: "default",
  error: "error",
};

const STATUS_LABEL: Record<ChannelConnection["status"], string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ChannelConnectionsPage(): JSX.Element {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ChannelConnection[] | null>(null);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void hotelApi.GET("/channel-connections", { params: { query: {} } }).then(({ data, error: err }) => {
      if (!live) return;
      if (err) setError("Could not load channel connections.");
      else setConnections(data?.data ?? []);
    });
    void hotelApi.GET("/properties", { params: { query: {} } }).then(({ data }) => {
      if (!live) return;
      const map: Record<string, Property> = {};
      for (const p of data?.data ?? []) map[p.id] = p;
      setProperties(map);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Channel connections</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /channel-connections">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/channels/new")}
            >
              Connect Channel
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Channel</ListingTable.Cell>
              <ListingTable.Cell>Property</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Last Synced</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(connections ?? []).map((c) => (
              <ListingTable.Row
                key={c.id}
                clickable
                onClick={() => navigate(`/channels/${c.id}`, { state: c })}
              >
                <ListingTable.Cell>{c.channelName}</ListingTable.Cell>
                <ListingTable.Cell>{properties[c.propertyId]?.name ?? c.propertyId}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip label={STATUS_LABEL[c.status]} color={STATUS_COLOR[c.status]} size="small" />
                </ListingTable.Cell>
                <ListingTable.Cell>{relativeTime(c.lastSyncedAt)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {connections?.length === 0 && (
          <ListingTable.EmptyState
            title="No channels connected"
            description="Connect a property to an OTA channel to start syncing rates and availability."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
