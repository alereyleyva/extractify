import { auth } from "@extractify/auth";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  createSheetsOAuthState,
  createSheetsOAuthUrl,
} from "@/lib/server/google-sheets-oauth";

export const Route = createFileRoute("/api/integrations/google-sheets/connect")(
  {
    server: {
      handlers: {
        GET: async ({ request }) => {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user?.id) {
            return Response.redirect(new URL("/", request.url), 302);
          }

          const state = createSheetsOAuthState({
            userId: session.user.id,
          });
          const oauthUrl = createSheetsOAuthUrl({ state });

          return Response.redirect(oauthUrl, 302);
        },
      },
    },
  },
);
