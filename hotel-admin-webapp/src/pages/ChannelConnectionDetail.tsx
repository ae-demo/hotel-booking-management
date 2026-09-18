import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/hotel-api";

type ChannelConnection = components["schemas"]["ChannelConnection"];
type SyncEvent = components["schemas"]["SyncEvent"];
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

const OUTCOME_LABEL: Record<SyncEvent["outcome"], string> = { success: "Success", failed: "Failed" };
const DIRECTION_LABEL: Record<SyncEvent["direction"], string> = { push: "Push", pull: "Pull" };

export function ChannelConnectionDetailPage(): JSX.Element {
  const { channelConnectionId } = useParams<{ channelConnectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!channelConnectionId) return;
    const passed = location.state as ChannelConnection | undefined;
    if (passed && passed.id === channelConnectionId) {
      setConnection(passed);
    } else {
      // No single-GET exists for a channel connection — resolve it from the
      // list this screen was reached from (also the deep-link fallback).
      void hotelApi.GET("/channel-connections", { params: { query: {} } }).then(({ data, error: err }) => {
        if (err) {
          setError("Could not load this channel connection.");
          return;
        }
        const found = data?.data.find((c) => c.id === channelConnectionId);
        if (found) setConnection(found);
        else setError("This channel connection could not be found.");
      });
    }

    void hotelApi
      .GET("/channel-connections/{channelConnectionId}/sync-events", {
        params: { path: { channelConnectionId }, query: {} },
      })
      .then(({ data, error: err }) => {
        if (!err) setSyncEvents(data?.data ?? []);
      });
  }, [channelConnectionId, location.state]);

  useEffect(() => {
    if (!connection) return;
    void hotelApi
      .GET("/properties/{propertyId}", { params: { path: { propertyId: connection.propertyId } } })
      .then(({ data }) => setProperty(data ?? null));
  }, [connection]);

  async function handleDisconnect(): Promise<void> {
    if (!channelConnectionId) return;
    setBusy(true);
    const { error: err } = await hotelApi.DELETE("/channel-connections/{channelConnectionId}", {
      params: { path: { channelConnectionId } },
    });
    setBusy(false);
    if (err) {
      setError("Could not disconnect this channel.");
      return;
    }
    navigate("/channels");
  }

  const title = connection
    ? `${connection.channelName} — ${property?.name ?? connection.propertyId}`
    : "Channel connection";

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/channels")}>Back</PageTitle.BackButton>
        <PageTitle.Header>{title}</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="DELETE /channel-connections/{channelConnectionId}">
            <Button variant="outlined" color="error" disabled={busy} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      {connection && (
        <Chip
          label={STATUS_LABEL[connection.status]}
          color={STATUS_COLOR[connection.status]}
          sx={{ mb: 3 }}
        />
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Sync history
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>When</ListingTable.Cell>
              <ListingTable.Cell>Direction</ListingTable.Cell>
              <ListingTable.Cell>Outcome</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(syncEvents ?? []).map((e) => (
              <ListingTable.Row key={e.id}>
                <ListingTable.Cell>{new Date(e.occurredAt).toLocaleString()}</ListingTable.Cell>
                <ListingTable.Cell>{DIRECTION_LABEL[e.direction]}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip
                    label={OUTCOME_LABEL[e.outcome]}
                    color={e.outcome === "failed" ? "error" : "success"}
                    size="small"
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {syncEvents?.length === 0 && (
          <ListingTable.EmptyState
            title="No sync history yet"
            description="Push and pull events with this channel will appear here."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
