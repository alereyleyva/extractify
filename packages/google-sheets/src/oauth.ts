import type {
  EncryptedSecret,
  SheetsOAuth,
} from "@extractify/shared/integrations";
import { OAuth2Client } from "google-auth-library";

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

export type ResolveSheetsAccessTokenInput = {
  oauth: SheetsOAuth;
  decryptSecret: (value: EncryptedSecret) => string;
  encryptSecret: (value: string) => EncryptedSecret;
  clientId?: string;
  clientSecret?: string;
  forceRefresh?: boolean;
};

export const SHEETS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "openid",
  "email",
] as const;

export function createSheetsOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const client = new OAuth2Client({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
  });

  return client.generateAuthUrl({
    access_type: "offline",
    scope: [...SHEETS_OAUTH_SCOPES],
    state: input.state,
    include_granted_scopes: true,
    prompt: "consent",
  });
}

export async function exchangeCodeForGoogleTokens(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const client = new OAuth2Client(
    input.clientId,
    input.clientSecret,
    input.redirectUri,
  );

  const { tokens } = await client.getToken(input.code);
  return tokens;
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | undefined> {
  const client = new OAuth2Client();
  client.setCredentials({ access_token: accessToken });

  try {
    const response = await client.request<{ email?: string }>({
      url: "https://openidconnect.googleapis.com/v1/userinfo",
    });
    return response.data.email;
  } catch {
    return undefined;
  }
}

function parseScopeList(scope: string | undefined): string[] {
  if (!scope) {
    return [];
  }
  return scope
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
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

  const client = new OAuth2Client(input.clientId, input.clientSecret);
  client.setCredentials({
    refresh_token: input.decryptSecret(input.oauth.refreshToken),
  });

  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Google token refresh failed");
  }

  const scopes = parseScopeList(credentials.scope);
  const nextOauth: SheetsOAuth = {
    ...input.oauth,
    scopes: scopes.length > 0 ? scopes : input.oauth.scopes,
    refreshToken: credentials.refresh_token
      ? input.encryptSecret(credentials.refresh_token)
      : input.oauth.refreshToken,
    accessToken: input.encryptSecret(credentials.access_token),
    accessTokenExpiresAt: credentials.expiry_date
      ? credentials.expiry_date
      : (input.oauth.accessTokenExpiresAt ?? null),
  };

  return {
    accessToken: credentials.access_token,
    oauth: nextOauth,
  };
}
