// The OAuth redirect target. Thunder sends the browser back here with the
// authorization code; handleCallback() exchanges it exactly once on mount,
// then we land back on the app's own root — never on a route that assumes an
// already-resolved session.
import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

export function CallbackPage(): ReactElement {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await handleCallback();
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : "Sign-in failed.");
        return;
      }
      if (live) navigate("/", { replace: true });
    })();
    return () => {
      live = false;
    };
  }, [navigate]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <CircularProgress />
            <Typography color="text.secondary">Completing sign-in…</Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
