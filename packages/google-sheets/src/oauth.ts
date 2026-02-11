import type {
  EncryptedSecret,
  SheetsOAuth,
} from "@extractify/shared/integrations";

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

type GoogleOAuthTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type ResolveSheetsAccessTokenInput = {
  oauth: SheetsOAuth;
  decryptSecret: (value: EncryptedSecret) => string;
  encryptSecret: (value: string) => EncryptedSecret;
  clientId?: string;
  clientSecret?: string;
  forceRefresh?: boolean;
};

function parseScopeList(scope: string | undefined): string[] {
  if (!scope) {
    return [];
  }
  return scope
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function refreshGoogleAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<GoogleOAuthTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = (await response.json()) as GoogleOAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Google token refresh failed",
    );
  }

  return payload;
}

export async function resolveSheetsAccessToken(
  input: ResolveSheetsAccessTokenInput,
): Promise<{ accessToken: string; oauth: SheetsOAuth }> {
  const forceRefresh = input.forceRefresh ?? false;
  const now = Date.now();
  const hasValidAccessToken =
    input.oauth.accessToken &&
    input.oauth.accessTokenExpiresAt &&
    input.oauth.accessTokenExpiresAt > now + ACCESS_TOKEN_EXPIRY_SKEW_MS;

  if (hasValidAccessToken && !forceRefresh) {
    const accessTokenSecret = input.oauth.accessToken;
    if (!accessTokenSecret) {
      throw new Error("Google access token is missing");
    }

    return {
      accessToken: input.decryptSecret(accessTokenSecret),
      oauth: input.oauth,
    };
  }

  if (!input.oauth.refreshToken) {
    throw new Error("Google Sheets OAuth refresh token is missing");
  }

  if (!input.clientId || !input.clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in server environment",
    );
  }

  const refreshToken = input.decryptSecret(input.oauth.refreshToken);
  const refreshed = await refreshGoogleAccessToken({
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    refreshToken,
  });

  const scopes = parseScopeList(refreshed.scope);
  const nextOauth: SheetsOAuth = {
    ...input.oauth,
    scopes: scopes.length > 0 ? scopes : input.oauth.scopes,
    refreshToken: refreshed.refresh_token
      ? input.encryptSecret(refreshed.refresh_token)
      : input.oauth.refreshToken,
    accessToken: input.encryptSecret(refreshed.access_token),
    accessTokenExpiresAt: refreshed.expires_in
      ? Date.now() + refreshed.expires_in * 1000
      : (input.oauth.accessTokenExpiresAt ?? null),
  };

  return {
    accessToken: refreshed.access_token,
    oauth: nextOauth,
  };
}
