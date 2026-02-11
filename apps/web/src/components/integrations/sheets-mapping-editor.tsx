import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SheetsMappingInput,
  SheetsMappingModelOption,
} from "@/lib/integrations/types";

function flattenAttributePaths(
  attributes: SheetsMappingModelOption["versions"][number]["attributes"],
  parentPath = "",
): string[] {
  const paths: string[] = [];

  for (const attribute of attributes) {
    const currentPath = parentPath
      ? `${parentPath}.${attribute.name}`
      : attribute.name;

    paths.push(currentPath);

    if (
      (attribute.type === "record" || attribute.type === "arrayOfRecords") &&
      attribute.children &&
      attribute.children.length > 0
    ) {
      paths.push(...flattenAttributePaths(attribute.children, currentPath));
    }
  }

  return paths;
}

function createEmptyColumn() {
  return {
    clientId: createClientId("column"),
    columnName: "",
    sourcePath: "",
    transform: "raw" as const,
  };
}

function createEmptyMapping(modelId?: string, modelVersionId?: string) {
  return {
    clientId: createClientId("mapping"),
    modelId: modelId ?? "",
    modelVersionId: modelVersionId ?? "",
    columns: [createEmptyColumn()],
  };
}

function createClientId(prefix: "mapping" | "column"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureClientIds(
  mappings: SheetsMappingInput[],
): SheetsMappingInput[] | null {
  let hasChanges = false;
  const next = mappings.map((mapping) => {
    const mappingClientId = mapping.clientId || createClientId("mapping");
    if (!mapping.clientId) {
      hasChanges = true;
    }

    const columns = mapping.columns.map((column) => {
      if (column.clientId) {
        return column;
      }
      hasChanges = true;
      return {
        ...column,
        clientId: createClientId("column"),
      };
    });

    if (
      mapping.clientId === mappingClientId &&
      columns.every((column, index) => column === mapping.columns[index])
    ) {
      return mapping;
    }

    return {
      ...mapping,
      clientId: mappingClientId,
      columns,
    };
  });

  return hasChanges ? next : null;
}

export function SheetsMappingEditor({
  modelOptions,
  value,
  onChange,
}: {
  modelOptions: SheetsMappingModelOption[];
  value: SheetsMappingInput[];
  onChange: (next: SheetsMappingInput[]) => void;
}) {
  useEffect(() => {
    const next = ensureClientIds(value);
    if (next) {
      onChange(next);
    }
  }, [onChange, value]);

  const mappings = useMemo(() => {
    if (value.length > 0) {
      return value;
    }

    if (modelOptions.length > 0) {
      return [
        createEmptyMapping(
          modelOptions[0]?.id,
          modelOptions[0]?.versions[0]?.id,
        ),
      ];
    }

    return [createEmptyMapping()];
  }, [modelOptions, value]);

  const updateMappings = (next: SheetsMappingInput[]) => {
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Model mappings</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const firstModel = modelOptions[0];
            updateMappings([
              ...mappings,
              createEmptyMapping(firstModel?.id, firstModel?.versions[0]?.id),
            ]);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add model mapping
        </Button>
      </div>

      <div className="space-y-5">
        {mappings.map((mapping, mappingIndex) => {
          const selectedModel =
            modelOptions.find((model) => model.id === mapping.modelId) ??
            modelOptions[0];
          const versions = selectedModel?.versions ?? [];
          const selectedVersion =
            versions.find((version) => version.id === mapping.modelVersionId) ??
            versions[0];
          const attributePaths = selectedVersion
            ? flattenAttributePaths(selectedVersion.attributes)
            : [];
          const sourcePathDatalistId = `sheets-source-paths-${mapping.clientId ?? mappingIndex}`;

          return (
            <div
              key={
                mapping.clientId ??
                `${mapping.modelId}-${mapping.modelVersionId}-${mappingIndex}`
              }
              className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">
                  Mapping #{mappingIndex + 1}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    updateMappings(
                      mappings.filter((_, index) => index !== mappingIndex),
                    )
                  }
                  disabled={mappings.length === 1}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={mapping.modelId || selectedModel?.id || ""}
                    onValueChange={(modelId) => {
                      const model = modelOptions.find(
                        (item) => item.id === modelId,
                      );
                      const firstVersion = model?.versions[0];
                      const next = [...mappings];
                      next[mappingIndex] = {
                        ...mapping,
                        modelId,
                        modelVersionId: firstVersion?.id ?? "",
                      };
                      updateMappings(next);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Select
                    value={mapping.modelVersionId || selectedVersion?.id || ""}
                    onValueChange={(modelVersionId) => {
                      const next = [...mappings];
                      next[mappingIndex] = {
                        ...mapping,
                        modelVersionId,
                      };
                      updateMappings(next);
                    }}
                    disabled={versions.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          v{version.versionNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Column mapping</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = [...mappings];
                      next[mappingIndex] = {
                        ...mapping,
                        columns: [...mapping.columns, createEmptyColumn()],
                      };
                      updateMappings(next);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add row
                  </Button>
                </div>

                <datalist id={sourcePathDatalistId}>
                  {attributePaths.map((path) => (
                    <option key={path} value={path} />
                  ))}
                </datalist>

                {mapping.columns.map((column, columnIndex) => (
                  <div
                    key={
                      column.clientId ??
                      `${column.columnName}-${column.sourcePath}-${columnIndex}`
                    }
                    className="grid gap-2 rounded-lg border border-border/60 bg-background p-3 md:grid-cols-3"
                  >
                    <Input
                      placeholder="Target column (Sheet)"
                      value={column.columnName}
                      onChange={(event) => {
                        const next = [...mappings];
                        const columns = [...mapping.columns];
                        columns[columnIndex] = {
                          ...column,
                          columnName: event.target.value,
                        };
                        next[mappingIndex] = { ...mapping, columns };
                        updateMappings(next);
                      }}
                    />
                    <Input
                      placeholder="Source field (Model path)"
                      value={column.sourcePath}
                      list={sourcePathDatalistId}
                      onChange={(event) => {
                        const next = [...mappings];
                        const columns = [...mapping.columns];
                        columns[columnIndex] = {
                          ...column,
                          sourcePath: event.target.value,
                        };
                        next[mappingIndex] = { ...mapping, columns };
                        updateMappings(next);
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          const next = [...mappings];
                          const columns = mapping.columns.filter(
                            (_, index) => index !== columnIndex,
                          );
                          next[mappingIndex] = {
                            ...mapping,
                            columns:
                              columns.length > 0
                                ? columns
                                : [createEmptyColumn()],
                          };
                          updateMappings(next);
                        }}
                        aria-label="Remove column mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
