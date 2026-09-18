import { useEffect, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/**
 * The OIDC redirect target. Routed OUTSIDE <AuthzProvider> — there is no
 * session to read until the redirect has been processed. Lands the caller on
 * `/` (the app's own guard then sends them to their role's first reachable
 * screen).
 */
export function CallbackPage(): JSX.Element {
  const [state, setState] = useState<"pending" | "done" | "error">("pending");

  useEffect(() => {
    let live = true;
    void handleCallback()
      .then(() => {
        if (live) setState("done");
      })
      .catch(() => {
        if (live) setState("error");
      });
    return () => {
      live = false;
    };
  }, []);

  if (state === "done") return <Navigate to="/" replace />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 10, gap: 2 }}>
      <Typography variant="h6">
        {state === "error" ? "Sign-in did not complete" : "Finishing sign-in…"}
      </Typography>
      {state === "error" && (
        <Typography color="text.secondary">
          Something went wrong completing sign-in. Try reloading the app.
        </Typography>
      )}
    </Box>
  );
}
