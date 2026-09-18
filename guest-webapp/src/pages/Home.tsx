// wireframes.dsl: screen Home "Search for a room across properties" — a row of
// Property/Check-in/Check-out/Guests plus a primary "Search" button that
// leads to SearchResults. Public: hotel-api's GET /properties is
// `security: []`, so this loads before sign-in.
import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  MenuItem,
  PageContent,
  PageTitle,
  Skeleton,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { defaultStayDates } from "../lib/hotel";

type Property = components["schemas"]["Property"];

export function HomePage(): ReactElement {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaults = defaultStayDates();
  const [propertyId, setPropertyId] = useState("");
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState("2");

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data, error: err } = await hotelApi.GET("/properties", {
        params: { query: { limit: 100 } },
      });
      if (!live) return;
      if (err) {
        setError("Could not load properties. Please try again.");
        return;
      }
      setProperties(data.data);
      if (data.data.length > 0) setPropertyId((current) => current || data.data[0].id);
    })();
    return () => {
      live = false;
    };
  }, []);

  function handleSearch(event: FormEvent): void {
    event.preventDefault();
    if (!propertyId) return;
    const params = new URLSearchParams({ propertyId, checkIn, checkOut, guests });
    navigate(`/search?${params.toString()}`);
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Find your stay</PageTitle.Header>
      </PageTitle>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {properties === null ? (
        <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
      ) : (
        <Stack
          component="form"
          onSubmit={handleSearch}
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "flex-end" }}
          sx={{ flexWrap: "wrap" }}
        >
          <TextField
            select
            label="Property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            sx={{ minWidth: 220 }}
            required
          >
            {properties.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {property.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            label="Check-in"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            type="date"
            label="Check-out"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            type="number"
            label="Guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ maxWidth: 120 }}
            required
          />
          <Button type="submit" variant="contained" sx={{ ml: { md: "auto" } }} disabled={!propertyId}>
            Search
          </Button>
        </Stack>
      )}
    </PageContent>
  );
}
