import type { ComponentProps } from "react";
import { SheetsMappingEditor } from "@/components/integrations/sheets-mapping-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SheetsMappingInput,
  SheetsMappingModelOption,
} from "@/lib/integrations/types";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

type SheetsIntegrationSectionProps = {
  accountDescription: string;
  connectLabel: string;
  connectVariant?: ButtonVariant;
  onConnectGoogle: () => void;
  isConnectingGoogle: boolean;
  onDisconnectGoogle?: () => void;
  isDisconnectingGoogle?: boolean;
  accountStatusText: string;
  spreadsheetInput: string;
  onSpreadsheetInputChange: (value: string) => void;
  sheetName: string;
  onSheetNameChange: (value: string) => void;
  modelOptions: SheetsMappingModelOption[];
  modelMappings: SheetsMappingInput[];
  onModelMappingsChange: (next: SheetsMappingInput[]) => void;
  onTestConnection: () => void;
  isTestingConnection: boolean;
  spreadsheetPlaceholder?: string;
  sheetNamePlaceholder?: string;
};

export function SheetsIntegrationSection({
  accountDescription,
  connectLabel,
  connectVariant = "default",
  onConnectGoogle,
  isConnectingGoogle,
  onDisconnectGoogle,
  isDisconnectingGoogle = false,
  accountStatusText,
  spreadsheetInput,
  onSpreadsheetInputChange,
  sheetName,
  onSheetNameChange,
  modelOptions,
  modelMappings,
  onModelMappingsChange,
  onTestConnection,
  isTestingConnection,
  spreadsheetPlaceholder = "https://docs.google.com/spreadsheets/d/...",
  sheetNamePlaceholder = "Sheet1",
}: SheetsIntegrationSectionProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-background p-4">
        <p className="font-medium text-sm">Google account</p>
        <p className="mb-3 text-muted-foreground text-xs">
          {accountDescription}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={connectVariant}
            onClick={onConnectGoogle}
            disabled={isConnectingGoogle}
          >
            {connectLabel}
          </Button>
          {onDisconnectGoogle ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={onDisconnectGoogle}
              disabled={isDisconnectingGoogle}
            >
              Disconnect
            </Button>
          ) : null}
          <span className="text-muted-foreground text-xs">
            {accountStatusText}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Spreadsheet URL or ID</Label>
          <Input
            placeholder={spreadsheetPlaceholder}
            value={spreadsheetInput}
            onChange={(event) => onSpreadsheetInputChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Sheet tab name</Label>
          <Input
            placeholder={sheetNamePlaceholder}
            value={sheetName}
            onChange={(event) => onSheetNameChange(event.target.value)}
          />
        </div>
      </div>

      <SheetsMappingEditor
        modelOptions={modelOptions}
        value={modelMappings}
        onChange={onModelMappingsChange}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onTestConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? "Testing..." : "Test connection"}
        </Button>
      </div>
    </div>
  );
}
