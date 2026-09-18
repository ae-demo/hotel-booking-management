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

const CHANNELS = ["Booking.com", "Expedia", "Airbnb", "Agoda"];

export function ChannelConnectionFormPage(): JSX.Element {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hotelApi.GET("/properties", { params: { query: {} } }).then(({ data }) => {
      setProperties(data?.data ?? []);
    });
  }, []);

  async function handleConnect(): Promise<void> {
    setSaving(true);
    setError(null);
    const { data, error: err } = await hotelApi.POST("/channel-connections", {
      body: { id: "", propertyId, channelName, status: "connected" },
    });
    setSaving(false);
    if (err || !data) {
      setError(`Could not connect ${channelName || "this channel"}. Check the account ID and try again.`);
      return;
    }
    navigate(`/channels/${data.id}`, { state: data });
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/channels")}>Back</PageTitle.BackButton>
        <PageTitle.Header>Connect a channel</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Form.Section>
        <Form.Stack>
          <TextField
            select
            label="Property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Channel"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          >
            {CHANNELS.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          {/* ChannelConnection (openapi.yaml) has no field for this — drawn per
              the wireframe, held locally, but not sent: connectChannel's
              request body carries no channel-account-id property. A design
              finding, not dropped silently. */}
          <TextField
            label="Channel account ID"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/channels")}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !propertyId || !channelName || !accountId}
          onClick={handleConnect}
        >
          Connect
        </Button>
      </Stack>
    </PageContent>
  );
}
