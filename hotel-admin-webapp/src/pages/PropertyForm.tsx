import { useState, type JSX } from "react";
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

const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "INR"];

export function PropertyFormPage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    const { data, error: err } = await hotelApi.POST("/properties", {
      body: { id: "", name, address, currency },
    });
    setSaving(false);
    if (err || !data) {
      setError("Could not create the property. Check the fields and try again.");
      return;
    }
    navigate(`/properties/${data.id}`);
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/properties")}>
          Back
        </PageTitle.BackButton>
        <PageTitle.Header>Property details</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Form.Section>
        <Form.Stack>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <TextField
            select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/properties")}>
          Cancel
        </Button>
        <Button variant="contained" disabled={saving || !name} onClick={handleSave}>
          Save Property
        </Button>
      </Stack>
    </PageContent>
  );
}
