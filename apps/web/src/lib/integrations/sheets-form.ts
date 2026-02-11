import type { SheetsModelMapping } from "@extractify/shared/integrations";
import { normalizeSheetsMappings } from "@/lib/integrations/sheets-mapping";
import type { SheetsMappingInput } from "@/lib/integrations/types";

export type ValidatedSheetsFormData = {
  spreadsheetInput: string;
  sheetName: string;
  modelMappings: SheetsModelMapping[];
};

type ValidateSheetsFormInput = {
  spreadsheetInput: string;
  sheetName: string;
  modelMappings: SheetsMappingInput[];
};

type ValidateSheetsFormResult =
  | {
      ok: true;
      data: ValidatedSheetsFormData;
    }
  | {
      ok: false;
      error: string;
    };

export function validateSheetsFormInput(
  input: ValidateSheetsFormInput,
): ValidateSheetsFormResult {
  const spreadsheetInput = input.spreadsheetInput.trim();
  if (!spreadsheetInput) {
    return {
      ok: false,
      error: "Spreadsheet URL or ID is required",
    };
  }

  const sheetName = input.sheetName.trim();
  if (!sheetName) {
    return {
      ok: false,
      error: "Sheet tab name is required",
    };
  }

  const modelMappings = normalizeSheetsMappings(input.modelMappings);
  if (modelMappings.length === 0) {
    return {
      ok: false,
      error: "At least one valid model mapping is required",
    };
  }

  return {
    ok: true,
    data: {
      spreadsheetInput,
      sheetName,
      modelMappings,
    },
  };
}
