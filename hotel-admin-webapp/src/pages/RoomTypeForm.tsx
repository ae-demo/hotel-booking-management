import { useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, PageContent, PageTitle, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";

export function RoomTypeFormPage(): JSX.Element {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [occupancy, setOccupancy] = useState("2");
  const [baseRate, setBaseRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (!propertyId) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await hotelApi.POST("/properties/{propertyId}/room-types", {
      params: { path: { propertyId } },
      body: {
        id: "",
        propertyId,
        name,
        occupancy: Number(occupancy),
        baseRate: Number(baseRate),
      },
    });
    setSaving(false);
    if (err || !data) {
      setError("Could not create the room type. Check the fields and try again.");
      return;
    }
    navigate(`/properties/${propertyId}/room-types/${data.id}`);
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate(`/properties/${propertyId}`)}>
          Back
        </PageTitle.BackButton>
        <PageTitle.Header>Room type details</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Form.Section>
        <Form.Stack>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Occupancy"
            type="number"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value)}
          />
          <TextField
            label="Base rate"
            type="number"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
          />
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate(`/properties/${propertyId}`)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !name || !baseRate}
          onClick={handleSave}
        >
          Save Room Type
        </Button>
      </Stack>
    </PageContent>
  );
}
