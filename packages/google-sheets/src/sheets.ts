import { OAuth2Client } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

type GoogleApiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type SpreadsheetLike = {
  loadInfo: () => Promise<void>;
  sheetsByTitle?: Record<string, WorksheetLike | undefined>;
  useOAuth2Client?: (client: OAuth2Client) => void;
};

type WorksheetLike = {
  loadHeaderRow?: (headerRowIndex?: number) => Promise<void>;
  setHeaderRow?: (headers: string[], headerRowIndex?: number) => Promise<void>;
  addRow?: (values: Record<string, string>) => Promise<void>;
  headerValues?: string[];
};

export class GoogleSheetsApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "GoogleSheetsApiError";
    this.status = status;
  }
}

function quoteSheetName(name: string): string {
  return `'${name.replaceAll("'", "''")}'`;
}

function toColumnLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function getStatusFromUnknownError(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  const status = error.status;
  if (typeof status === "number") {
    return status;
  }

  const response = error.response;
  if (isRecord(response) && typeof response.status === "number") {
    return response.status;
  }

  return null;
}

function getMessageFromUnknownError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (!error.message) {
    return fallback;
  }

  return error.message;
}

async function callGoogleJson<T>(
  input: string | URL,
  init: RequestInit & { accessToken: string },
): Promise<{ data: T; status: number }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Google Sheets API request failed";
    try {
      const payload = (await response.json()) as GoogleApiErrorBody;
      message = payload.error?.message || message;
    } catch {
      // Keep default message if JSON cannot be parsed.
    }
    throw new GoogleSheetsApiError(message, response.status);
  }

  return {
    data: (await response.json()) as T,
    status: response.status,
  };
}

async function callGoogleNoContent(
  input: string | URL,
  init: RequestInit & { accessToken: string },
): Promise<{ status: number }> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Google Sheets API request failed";
    try {
      const payload = (await response.json()) as GoogleApiErrorBody;
      message = payload.error?.message || message;
    } catch {
      // Keep default message if JSON cannot be parsed.
    }
    throw new GoogleSheetsApiError(message, response.status);
  }

  return { status: response.status };
}

async function createSpreadsheetClient(input: {
  spreadsheetId: string;
  accessToken: string;
}): Promise<SpreadsheetLike> {
  const authClient = new OAuth2Client();
  authClient.setCredentials({
    access_token: input.accessToken,
  });

  const doc = new GoogleSpreadsheet(
    input.spreadsheetId,
    authClient,
  ) as unknown as SpreadsheetLike;

  if (typeof doc.useOAuth2Client === "function") {
    doc.useOAuth2Client(authClient);
  }

  try {
    await doc.loadInfo();
  } catch (error) {
    throw new GoogleSheetsApiError(
      getMessageFromUnknownError(error, "Google Sheets API request failed"),
      getStatusFromUnknownError(error),
    );
  }

  return doc;
}

async function getWorksheet(input: {
  spreadsheetId: string;
  accessToken: string;
  sheetName: string;
}): Promise<WorksheetLike> {
  const doc = await createSpreadsheetClient(input);
  const sheet = doc.sheetsByTitle?.[input.sheetName];

  if (!sheet) {
    throw new GoogleSheetsApiError(
      `Sheet tab "${input.sheetName}" was not found`,
    );
  }

  return sheet;
}

async function getSheetHeaderViaApi(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}): Promise<string[]> {
  const range = `${quoteSheetName(input.sheetName)}!${input.headerRow}:${input.headerRow}`;
  const encodedId = encodeURIComponent(input.spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const { data } = await callGoogleJson<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodedId}/values/${encodedRange}`,
    {
      method: "GET",
      accessToken: input.accessToken,
    },
  );

  return data.values?.[0] ?? [];
}

async function writeSheetHeaderViaApi(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  headers: string[];
}): Promise<void> {
  const firstColumn = "A";
  const lastColumn = toColumnLabel(Math.max(0, input.headers.length - 1));
  const range = `${quoteSheetName(input.sheetName)}!${firstColumn}${input.headerRow}:${lastColumn}${input.headerRow}`;
  const encodedId = encodeURIComponent(input.spreadsheetId);
  const encodedRange = encodeURIComponent(range);

  await callGoogleNoContent(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodedId}/values/${encodedRange}?valueInputOption=RAW`,
    {
      method: "PUT",
      accessToken: input.accessToken,
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [input.headers],
      }),
    },
  );
}

async function appendSheetRowViaApi(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  values: string[];
}): Promise<number> {
  const range = `${quoteSheetName(input.sheetName)}!A:ZZZ`;
  const encodedId = encodeURIComponent(input.spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const { status } = await callGoogleNoContent(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodedId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      accessToken: input.accessToken,
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [input.values],
      }),
    },
  );

  return status;
}

export async function getSheetHeader(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}): Promise<string[]> {
  const sheet = await getWorksheet(input);

  if (typeof sheet.loadHeaderRow === "function") {
    try {
      await sheet.loadHeaderRow(input.headerRow);
      return (sheet.headerValues ?? [])
        .map((value) => value?.trim() ?? "")
        .filter(Boolean);
    } catch (error) {
      throw new GoogleSheetsApiError(
        getMessageFromUnknownError(error, "Google Sheets API request failed"),
        getStatusFromUnknownError(error),
      );
    }
  }

  return getSheetHeaderViaApi(input);
}

export async function writeSheetHeader(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  headers: string[];
}): Promise<void> {
  const sheet = await getWorksheet(input);

  if (typeof sheet.setHeaderRow === "function") {
    try {
      await sheet.setHeaderRow(input.headers, input.headerRow);
      return;
    } catch (error) {
      throw new GoogleSheetsApiError(
        getMessageFromUnknownError(error, "Google Sheets API request failed"),
        getStatusFromUnknownError(error),
      );
    }
  }

  await writeSheetHeaderViaApi(input);
}

export async function appendSheetRow(input: {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  values: string[];
  headers: string[];
}): Promise<number> {
  const sheet = await getWorksheet(input);

  if (typeof sheet.addRow === "function") {
    const row = Object.fromEntries(
      input.headers.map((header, index) => [header, input.values[index] ?? ""]),
    );

    try {
      await sheet.addRow(row);
      return 200;
    } catch (error) {
      throw new GoogleSheetsApiError(
        getMessageFromUnknownError(error, "Google Sheets API request failed"),
        getStatusFromUnknownError(error),
      );
    }
  }

  return appendSheetRowViaApi(input);
}
