type SheetsOAuthPopupMessage = {
  type?: string;
  status?: "connected" | "error";
  reason?: string;
  accountEmail?: string;
};

export type SheetsOAuthPopupResult =
  | {
      status: "connected";
      accountEmail?: string;
    }
  | {
      status: "error";
      reason?: string;
    }
  | {
      status: "closed";
    };

const OAUTH_POPUP_NAME = "extractify-google-sheets-oauth";
const OAUTH_POPUP_FEATURES =
  "popup=yes,width=540,height=720,resizable=yes,scrollbars=yes";

export function openSheetsOAuthPopup(
  url: string,
): Promise<SheetsOAuthPopupResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      status: "error",
      reason: "oauth_popup_requires_browser",
    });
  }

  const popup = window.open(url, OAUTH_POPUP_NAME, OAUTH_POPUP_FEATURES);
  if (!popup) {
    return Promise.resolve({
      status: "error",
      reason: "popup_blocked",
    });
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: SheetsOAuthPopupResult) => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener("message", handleMessage);
      clearInterval(closedCheckInterval);
      resolve(result);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as SheetsOAuthPopupMessage | undefined;
      if (data?.type !== "extractify:sheets-oauth") {
        return;
      }

      if (data.status === "connected") {
        finish({
          status: "connected",
          accountEmail: data.accountEmail,
        });
        return;
      }

      finish({
        status: "error",
        reason: data.reason,
      });
    };

    window.addEventListener("message", handleMessage);

    const closedCheckInterval = window.setInterval(() => {
      if (popup.closed) {
        finish({ status: "closed" });
      }
    }, 400);
  });
}
