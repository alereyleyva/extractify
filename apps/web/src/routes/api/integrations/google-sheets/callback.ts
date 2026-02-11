import { createFileRoute } from "@tanstack/react-router";
import {
  createPendingSheetsOAuthSession,
  exchangeCodeForGoogleTokens,
  fetchGoogleAccountEmail,
  parseSheetsOAuthState,
  SHEETS_PENDING_OAUTH_COOKIE,
} from "@/lib/server/google-sheets-oauth";
import { encryptSecret } from "@/lib/server/integration-secrets";

function buildSetCookieHeader(input: {
  name: string;
  value: string;
  secure: boolean;
  maxAgeSeconds: number;
}): string {
  const serializedValue = encodeURIComponent(input.value);
  const parts = [
    `${input.name}=${serializedValue}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${input.maxAgeSeconds}`,
  ];
  if (input.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function popupResponse(input: {
  payload: {
    type: "extractify:sheets-oauth";
    status: "connected" | "error";
    reason?: string;
    accountEmail?: string;
  };
  setCookieHeader?: string;
}): Response {
  const payloadJson = serializeForInlineScript(input.payload);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Extractify OAuth</title>
  </head>
  <body>
    <script>
      (() => {
        const payload = ${payloadJson};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
          window.close();
          return;
        }
        document.body.innerHTML = payload.status === "connected"
          ? "<p>Google account connected. You can close this window.</p>"
          : "<p>OAuth failed. You can close this window and try again.</p>";
      })();
    </script>
    <p>Completing OAuth...</p>
  </body>
</html>`;

  const response = new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

  if (input.setCookieHeader) {
    response.headers.append("Set-Cookie", input.setCookieHeader);
  }

  return response;
}

export const Route = createFileRoute(
  "/api/integrations/google-sheets/callback",
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const stateParam = requestUrl.searchParams.get("state");
        const oauthError = requestUrl.searchParams.get("error");

        if (!stateParam) {
          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "error",
              reason: "missing_state",
            },
          });
        }

        const state = parseSheetsOAuthState(stateParam);
        if (!state) {
          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "error",
              reason: "invalid_state",
            },
          });
        }

        if (oauthError) {
          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "error",
              reason: oauthError,
            },
          });
        }

        if (!code) {
          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "error",
              reason: "missing_code",
            },
          });
        }

        try {
          const tokenResponse = await exchangeCodeForGoogleTokens(code);
          if (!tokenResponse.refresh_token) {
            throw new Error("Google did not return a refresh token");
          }

          if (!tokenResponse.access_token) {
            throw new Error("Google did not return an access token");
          }

          const accessTokenExpiresAt = tokenResponse.expiry_date || null;
          const accountEmail = await fetchGoogleAccountEmail(
            tokenResponse.access_token,
          );
          const sealedSession = createPendingSheetsOAuthSession({
            userId: state.userId,
            accountEmail,
            scopes: (tokenResponse.scope ?? "")
              .split(" ")
              .map((scope) => scope.trim())
              .filter(Boolean),
            refreshToken: encryptSecret(tokenResponse.refresh_token),
            accessToken: encryptSecret(tokenResponse.access_token),
            accessTokenExpiresAt,
          });

          const setCookieHeader = buildSetCookieHeader({
            name: SHEETS_PENDING_OAUTH_COOKIE,
            value: sealedSession,
            secure: requestUrl.protocol === "https:",
            maxAgeSeconds: 30 * 60,
          });

          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "connected",
              accountEmail,
            },
            setCookieHeader,
          });
        } catch (error) {
          const reason =
            error instanceof Error
              ? error.message.slice(0, 120)
              : "oauth_failed";
          return popupResponse({
            payload: {
              type: "extractify:sheets-oauth",
              status: "error",
              reason,
            },
          });
        }
      },
    },
  },
});
