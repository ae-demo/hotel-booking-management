import { useEffect, useState, type JSX } from "react";
import { Card, CardContent, Grid, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { BarChart } from "@wso2/oxygen-ui-charts-react";
import { hotelApi } from "../api";
import { Can, useAuthz } from "../authz/gates";
import { OPERATIONS } from "../authz/operations.gen";
import { canCall } from "../authz/rules";
import type { components } from "../generated/hotel-api";

type BookingReport = components["schemas"]["BookingReport"];

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ManagerDashboardPage(): JSX.Element {
  const { scopes, signedIn } = useAuthz();
  const canReadChannelConnections = canCall(
    OPERATIONS["GET /channel-connections"],
    scopes,
    signedIn,
  );
  const [reports, setReports] = useState<BookingReport[] | null>(null);
  const [channelCount, setChannelCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void hotelApi
      .GET("/reports/bookings", { params: { query: {} } })
      .then(({ data, error: err }) => {
        if (!live) return;
        if (err) setError("Could not load the booking report.");
        else setReports(data ?? []);
      });
    return () => {
      live = false;
    };
  }, []);

  // Loaded separately, and only when the caller holds channel-connections:read
  // — HotelManager's grants do not include it (security.json), so this stat is
  // shown as unavailable to that role rather than attempted and failed. The
  // scope check MUST happen before the call, not just around the rendered
  // value: hotelApi's shared middleware (src/api.ts -> src/authz/client.ts)
  // treats every 401 from a live session as a Forbidden refusal and navigates
  // the WHOLE app to /forbidden, so firing this request unconditionally took
  // down the entire Dashboard for any role that doesn't hold this one scope.
  useEffect(() => {
    if (!canReadChannelConnections) return;
    let live = true;
    void hotelApi.GET("/channel-connections", { params: { query: {} } }).then(({ data, error: err }) => {
      if (!live) return;
      if (!err) setChannelCount(data?.count ?? 0);
    });
    return () => {
      live = false;
    };
  }, [canReadChannelConnections]);

  const totalBookings = reports?.reduce((sum, r) => sum + (r.totalBookings ?? 0), 0) ?? 0;
  const totalRevenue = reports?.reduce((sum, r) => sum + (r.totalRevenue ?? 0), 0) ?? 0;
  const chartData =
    reports?.map((r) => ({
      property: r.propertyId ?? "—",
      direct: r.directBookings ?? 0,
      channel: r.channelBookings ?? 0,
    })) ?? [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Overview</PageTitle.Header>
      </PageTitle>

      {error && <Typography color="error">{error}</Typography>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Bookings this month
              </Typography>
              <Typography variant="h4">{reports ? totalBookings : "…"}</Typography>
              <Typography variant="caption" color="text.secondary">
                across all properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Revenue this month
              </Typography>
              <Typography variant="h4">{reports ? formatMoney(totalRevenue) : "…"}</Typography>
              <Typography variant="caption" color="text.secondary">
                across all properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Connected channels
              </Typography>
              <Can
                op="GET /channel-connections"
                fallback={
                  <Typography variant="body2" color="text.secondary">
                    Not available to your role
                  </Typography>
                }
              >
                <Typography variant="h4">{channelCount ?? "…"}</Typography>
              </Can>
              <Typography variant="caption" color="text.secondary">
                OTA channels live
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Bookings by source (30 days)
      </Typography>
      <Card>
        <CardContent>
          <BarChart
            data={chartData}
            xAxisDataKey="property"
            height={260}
            width="100%"
            bars={[
              { dataKey: "direct", name: "Direct", fill: "var(--mui-palette-primary-main)" },
              { dataKey: "channel", name: "Channel", fill: "var(--mui-palette-info-main)" },
            ]}
            legend={{ show: true }}
          />
        </CardContent>
      </Card>
    </PageContent>
  );
}
