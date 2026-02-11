import type { SheetsModelMapping } from "@extractify/shared/integrations";
import type { SheetsMappingInput } from "@/lib/integrations/types";

export function normalizeSheetsMappings(
  value: SheetsMappingInput[],
): SheetsModelMapping[] {
  return value
    .map((mapping) => ({
      modelId: mapping.modelId.trim(),
      modelVersionId: mapping.modelVersionId.trim(),
      columns: mapping.columns
        .map((column) => {
          const joinWith = column.joinWith?.trim();
          const fallback = column.fallback?.trim();

          return {
            columnName: column.columnName.trim(),
            sourcePath: column.sourcePath.trim(),
            transform: column.transform,
            joinWith: joinWith || undefined,
            fallback: fallback || undefined,
          };
        })
        .filter((column) => column.columnName && column.sourcePath),
    }))
    .filter(
      (mapping) =>
        mapping.modelId.length > 0 &&
        mapping.modelVersionId.length > 0 &&
        mapping.columns.length > 0,
    );
}
