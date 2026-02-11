import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-handling";
import { openSheetsOAuthPopup } from "@/lib/integrations/sheets-oauth-popup";
import { queryKeys } from "@/lib/query-keys";

type StartSheetsOAuthResult = {
  url?: string;
};

type ConnectSheetsOAuthInput = {
  queryClient: QueryClient;
  startOAuth: () => Promise<StartSheetsOAuthResult | null | undefined>;
  onConnected?: (accountEmail?: string) => void;
};

export async function connectSheetsOAuth(
  input: ConnectSheetsOAuthInput,
): Promise<void> {
  try {
    const result = await input.startOAuth();
    if (!result?.url) {
      throw new Error("Unable to start OAuth flow");
    }

    const oauthResult = await openSheetsOAuthPopup(result.url);
    await input.queryClient.invalidateQueries({
      queryKey: queryKeys.pendingSheetsOAuth,
    });

    if (oauthResult.status === "connected") {
      input.onConnected?.(oauthResult.accountEmail);
      toast.success(
        oauthResult.accountEmail
          ? `Connected as ${oauthResult.accountEmail}`
          : "Google account connected",
      );
      return;
    }

    if (oauthResult.status === "closed") {
      return;
    }

    if (oauthResult.reason === "popup_blocked") {
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }

    toast.error(
      oauthResult.reason
        ? `OAuth failed: ${oauthResult.reason}`
        : "OAuth failed",
    );
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}
