// Shared status -> label/color mapping for the reservation screens.
import type { components } from "../generated/hotel-api";

type Status = components["schemas"]["Reservation"]["status"];

const LABELS: Record<Status, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  "checked-in": "Checked In",
  "checked-out": "Checked Out",
  cancelled: "Cancelled",
};

const COLORS: Record<Status, "warning" | "success" | "info" | "default" | "error"> = {
  pending: "warning",
  confirmed: "success",
  "checked-in": "info",
  "checked-out": "default",
  cancelled: "error",
};

export function statusLabel(status: Status): string {
  return LABELS[status] ?? status;
}

export function statusColor(status: Status): "warning" | "success" | "info" | "default" | "error" {
  return COLORS[status] ?? "default";
}
