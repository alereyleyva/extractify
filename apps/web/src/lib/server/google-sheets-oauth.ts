import crypto from "node:crypto";
import { env } from "@extractify/env/server";
import type { EncryptedSecret } from "@extractify/shared/integrations";

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;

export const SHEETS_PENDING_OAUTH_COOKIE = "__extractify_sheets_oauth_pending";

export const SHEETS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "openid",
  "email",
] as const;

type SignedTokenEnvelope<TPayload> = {
  version: "v1";
  payload: TPayload;
};

type SheetsOAuthStatePayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};

export type PendingSheetsOAuthSession = {
  userId: string;
  accountEmail?: string;
  scopes: string[];
  refreshToken: EncryptedSecret;
  accessToken?: EncryptedSecret | null;
  accessTokenExpiresAt?: number | null;
  issuedAt: number;
  expiresAt: number;
};

export type GoogleOAuthTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

function getSigningKey(): Buffer {
  const key = Buffer.from(env.INTEGRATION_SECRETS_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_SECRETS_KEY must be 32 bytes base64");
  }
  return key;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("base64url");
}

function sealSignedPayload<TPayload>(payload: TPayload): string {
  const envelope: SignedTokenEnvelope<TPayload> = {
    version: "v1",
    payload,
  };
  const body = JSON.stringify(envelope);
  const encodedBody = encodeBase64Url(body);
  const signature = sign(encodedBody);
  return `${encodedBody}.${signature}`;
}

function unsealSignedPayload<TPayload>(token: string): TPayload | null {
  const [encodedBody, signature] = token.split(".");
  if (!encodedBody || !signature) {
    return null;
  }

  const expected = sign(encodedBody);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(encodedBody);
    const parsed = JSON.parse(decoded) as SignedTokenEnvelope<TPayload>;
    if (parsed.version !== "v1") {
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

export function getSheetsOAuthRedirectUri(): string {
  const callback = new URL(
    "/api/integrations/google-sheets/callback",
    env.BETTER_AUTH_URL,
  );
  return callback.toString();
}

export function createSheetsOAuthState(input: { userId: string }): string {
  const now = Date.now();
  const payload: SheetsOAuthStatePayload = {
    userId: input.userId,
    issuedAt: now,
    expiresAt: now + STATE_TTL_MS,
  };

  return sealSignedPayload(payload);
}

export function parseSheetsOAuthState(
  state: string,
): SheetsOAuthStatePayload | null {
  const payload = unsealSignedPayload<SheetsOAuthStatePayload>(state);
  if (!payload) {
    return null;
  }

  if (payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export function createSheetsOAuthUrl(input: { state: string }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getSheetsOAuthRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SHEETS_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeCodeForGoogleTokens(
  code: string,
): Promise<GoogleOAuthTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getSheetsOAuthRedirectUri(),
      grant_type: "authorization_code",
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
        "OAuth token exchange failed",
    );
  }

  return payload;
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | undefined> {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as { email?: string };
  return payload.email;
}

export function createPendingSheetsOAuthSession(input: {
  userId: string;
  accountEmail?: string;
  scopes: string[];
  refreshToken: EncryptedSecret;
  accessToken?: EncryptedSecret | null;
  accessTokenExpiresAt?: number | null;
}): string {
  const now = Date.now();
  const payload: PendingSheetsOAuthSession = {
    userId: input.userId,
    accountEmail: input.accountEmail,
    scopes: input.scopes,
    refreshToken: input.refreshToken,
    accessToken: input.accessToken ?? null,
    accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  return sealSignedPayload(payload);
}

export function parsePendingSheetsOAuthSession(
  token: string,
): PendingSheetsOAuthSession | null {
  const payload = unsealSignedPayload<PendingSheetsOAuthSession>(token);
  if (!payload) {
    return null;
  }

  if (payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}
