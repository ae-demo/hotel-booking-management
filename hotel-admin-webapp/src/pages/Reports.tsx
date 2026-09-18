import { useEffect, useState, type JSX } from "react";
import {
  Button,
  Card,
  CardContent,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Download } from "@wso2/oxygen-ui-icons-react";
import { PieChart } from "@wso2/oxygen-ui-charts-react";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";

type Property = components["schemas"]["Property"];
type BookingReport = components["schemas"]["BookingReport"];

export function ReportsPage(): JSX.Element {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reports, setReports] = useState<BookingReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hotelApi.GET("/properties", { params: { query: {} } }).then(({ data }) => {
      setProperties(data?.data ?? []);
    });
  }, []);

  useEffect(() => {
    let live = true;
    void hotelApi
      .GET("/reports/revenue", {
        params: {
          query: {
            propertyId: propertyId || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        },
      })
      .then(({ data, error: err }) => {
        if (!live) return;
        if (err) setError("Could not load the revenue report.");
        else setReports(data ?? []);
      });
    return () => {
      live = false;
    };
  }, [propertyId, from, to]);

  function propertyName(id?: string): string {
    return properties.find((p) => p.id === id)?.name ?? id ?? "—";
  }

  const totalDirect = reports?.reduce((sum, r) => sum + (r.directBookings ?? 0), 0) ?? 0;
  const totalChannel = reports?.reduce((sum, r) => sum + (r.channelBookings ?? 0), 0) ?? 0;

  function handleExport(): void {
    const rows = [
      ["Property", "Direct", "Channel", "Total Revenue"],
      ...(reports ?? []).map((r) => [
        propertyName(r.propertyId),
        String(r.directBookings ?? 0),
        String(r.channelBookings ?? 0),
        (r.totalRevenue ?? 0).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Reports</PageTitle.Header>
      </PageTitle>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <TextField
          select
          label="Property"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All properties</MenuItem>
          {properties.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Stack direction="row" sx={{ flexGrow: 1 }} justifyContent="flex-end">
          <Button variant="outlined" startIcon={<Download size={18} />} onClick={handleExport}>
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {error && <Typography color="error">{error}</Typography>}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Revenue by channel
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <PieChart
            data={[
              { name: "Direct", value: totalDirect },
              { name: "Channel", value: totalChannel },
            ]}
            pies={[{ dataKey: "value", nameKey: "name" }]}
            height={260}
            width="100%"
            legend={{ show: true }}
          />
        </CardContent>
      </Card>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Property</ListingTable.Cell>
              <ListingTable.Cell>Direct</ListingTable.Cell>
              <ListingTable.Cell>Channel</ListingTable.Cell>
              <ListingTable.Cell>Total Revenue</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(reports ?? []).map((r, i) => (
              <ListingTable.Row key={r.propertyId ?? i}>
                <ListingTable.Cell>{propertyName(r.propertyId)}</ListingTable.Cell>
                <ListingTable.Cell>{r.directBookings ?? 0}</ListingTable.Cell>
                <ListingTable.Cell>{r.channelBookings ?? 0}</ListingTable.Cell>
                <ListingTable.Cell>{(r.totalRevenue ?? 0).toFixed(2)}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {reports?.length === 0 && (
          <ListingTable.EmptyState
            title="No revenue yet"
            description="Revenue appears here once reservations are booked."
          />
        )}
      </ListingTable.Container>
    </PageContent>
  );
}
