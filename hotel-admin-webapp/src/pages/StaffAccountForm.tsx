import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

type StaffAccount = components["schemas"]["StaffAccount"];

const ROLES: StaffAccount["role"][] = ["FrontDeskAgent", "ChannelOperator"];

export function StaffAccountFormPage(): JSX.Element {
  const { staffAccountId } = useParams<{ staffAccountId?: string }>();
  const isEdit = Boolean(staffAccountId);
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffAccount["role"]>("FrontDeskAgent");
  // No single-property selector is drawn on this screen (wireframes.dsl); the
  // account is filed under the first property this manager account sees. A
  // design finding, not a UI gap: report if multi-property staff assignment
  // needs its own control.
  const [propertyId, setPropertyId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hotelApi.GET("/properties", { params: { query: {} } }).then(({ data }) => {
      if (data?.data?.[0]) setPropertyId((prev) => prev || data.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!isEdit || !staffAccountId) return;
    const passed = location.state as StaffAccount | undefined;
    if (passed && passed.id === staffAccountId) {
      applyAccount(passed);
      return;
    }
    // Direct navigation with no state (deep link / reload): no single-GET
    // exists for a staff account, so fall back to the list and find it.
    void hotelApi.GET("/staff-accounts", { params: { query: {} } }).then(({ data, error: err }) => {
      if (err) {
        setError("Could not load this staff account.");
        return;
      }
      const found = data?.data.find((s) => s.id === staffAccountId);
      if (found) applyAccount(found);
      else setError("This staff account could not be found.");
    });

    function applyAccount(account: StaffAccount): void {
      setName(account.name);
      setEmail(account.email);
      setRole(account.role);
      setPropertyId(account.propertyId);
    }
  }, [isEdit, staffAccountId, location.state]);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    const body: StaffAccount = { id: staffAccountId ?? "", propertyId, name, email, role };
    const { error: err } = isEdit && staffAccountId
      ? await hotelApi.PUT("/staff-accounts/{staffAccountId}", {
          params: { path: { staffAccountId } },
          body,
        })
      : await hotelApi.POST("/staff-accounts", { body });
    setSaving(false);
    if (err) {
      setError("Could not save this staff account. Check the fields and try again.");
      return;
    }
    navigate("/staff");
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate("/staff")}>Back</PageTitle.BackButton>
        <PageTitle.Header>Staff account</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Form.Section>
        <Form.Stack>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffAccount["role"])}
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/staff")}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !name || !email || !propertyId}
          onClick={handleSave}
        >
          Save
        </Button>
      </Stack>
    </PageContent>
  );
}
