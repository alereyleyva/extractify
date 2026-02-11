const GOOGLE_SHEETS_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GOOGLE_SHEETS_ID_ONLY_PATTERN = /^[a-zA-Z0-9-_]{20,}$/;

export function parseSpreadsheetId(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("Spreadsheet URL or ID is required");
  }

  if (GOOGLE_SHEETS_ID_ONLY_PATTERN.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const match = GOOGLE_SHEETS_ID_PATTERN.exec(url.pathname);
    if (match?.[1]) {
      return match[1];
    }
    throw new Error("Invalid Google Sheets URL");
  } catch {
    const fallbackMatch = GOOGLE_SHEETS_ID_PATTERN.exec(value);
    if (fallbackMatch?.[1]) {
      return fallbackMatch[1];
    }
    throw new Error("Invalid Google Sheets URL or ID");
  }
}
