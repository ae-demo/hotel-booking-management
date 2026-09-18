// wireframes.dsl: screen RoomDetail "A room type's details and rate" — the
// room's rate, a cancellation note, and a primary "Book Now" leading to
// Checkout. Public, same as SearchResults: hotel-api has no single
// get-room-type-by-id operation, so this re-reads the property's room-type
// list (the same public, security:[] operation SearchResults loads) and
// finds the one the caller picked.
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, PageContent, PageTitle, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import { hotelApi } from "../api";
import type { components } from "../generated/hotel-api";
import { formatMoney, nightsBetween } from "../lib/hotel";
import type { CheckoutState } from "./Checkout";

type RoomType = components["schemas"]["RoomType"];
type Property = components["schemas"]["Property"];

export function RoomDetailPage(): ReactElement {
  const { roomTypeId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get("propertyId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = searchParams.get("guests") ?? "";

  const [property, setProperty] = useState<Property | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setError("Missing search context. Go back and search again.");
      setRoomType(null);
      return;
    }
    let live = true;
    void (async () => {
      const [propertyRes, roomTypesRes] = await Promise.all([
        hotelApi.GET("/properties/{propertyId}", { params: { path: { propertyId } } }),
        hotelApi.GET("/properties/{propertyId}/room-types", {
          params: { path: { propertyId }, query: { limit: 100 } },
        }),
      ]);
      if (!live) return;
      if (propertyRes.error || roomTypesRes.error) {
        setError("Could not load this room's details.");
        setRoomType(null);
        return;
      }
      setProperty(propertyRes.data);
      setRoomType(roomTypesRes.data.data.find((rt) => rt.id === roomTypeId) ?? null);
    })();
    return () => {
      live = false;
    };
  }, [propertyId, roomTypeId]);

  const nights = nightsBetween(checkIn, checkOut);

  function bookNow(): void {
    if (!roomType || !property || nights <= 0) return;
    const state: CheckoutState = {
      roomType,
      property,
      checkIn,
      checkOut,
      guests,
      nights,
      total: roomType.baseRate * nights,
    };
    navigate("/checkout", { state });
  }

  if (roomType === undefined) {
    return (
      <PageContent>
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
      </PageContent>
    );
  }

  if (error || !roomType || !property) {
    return (
      <PageContent>
        <Alert severity="error">{error ?? "This room type could not be found."}</Alert>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton onClick={() => navigate(-1)} />
        <PageTitle.Header>{roomType.name}</PageTitle.Header>
      </PageTitle>

      <Stack spacing={1.5}>
        <Typography variant="h6">
          {property.name} — {formatMoney(roomType.baseRate, property.currency)}/night
        </Typography>
        <Typography color="text.secondary">Sleeps up to {roomType.occupancy} guests</Typography>
        <Typography color="text.secondary">
          Free cancellation up to 24 hours before check-in
        </Typography>
        {checkIn && checkOut ? (
          <Typography color="text.secondary">
            {checkIn} to {checkOut}
            {nights > 0 ? ` (${nights} night${nights > 1 ? "s" : ""})` : ""}
            {nights > 0 ? ` — total ${formatMoney(roomType.baseRate * nights, property.currency)}` : ""}
          </Typography>
        ) : null}
        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 2 }}>
          <Button variant="contained" onClick={bookNow} disabled={nights <= 0}>
            Book Now
          </Button>
        </Stack>
      </Stack>
    </PageContent>
  );
}
