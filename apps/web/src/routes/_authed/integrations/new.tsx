import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PlugZap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SheetsIntegrationSection } from "@/components/integrations/sheets-integration-section";
import { WebhookIntegrationFields } from "@/components/integrations/webhook-integration-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/error-handling";
import { validateSheetsFormInput } from "@/lib/integrations/sheets-form";
import { connectSheetsOAuth } from "@/lib/integrations/sheets-oauth";
import type {
  IntegrationTargetType,
  SheetsMappingInput,
} from "@/lib/integrations/types";
import {
  useCreateSheetsIntegrationMutation,
  useCreateWebhookIntegrationMutation,
  usePendingSheetsOAuthQuery,
  useSheetsModelOptions,
  useStartSheetsOAuthMutation,
  useTestSheetsIntegrationMutation,
} from "@/lib/query-hooks";

export const Route = createFileRoute("/_authed/integrations/new")({
  component: IntegrationCreatePage,
});

function IntegrationCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createWebhookIntegrationMutation =
    useCreateWebhookIntegrationMutation();
  const createSheetsIntegrationMutation = useCreateSheetsIntegrationMutation();
  const testSheetsIntegrationMutation = useTestSheetsIntegrationMutation();
  const startSheetsOAuthMutation = useStartSheetsOAuthMutation();

  const { data: pendingSheetsOAuth } = usePendingSheetsOAuthQuery();
  const modelOptions = useSheetsModelOptions();

  const [name, setName] = useState("");
  const [type, setType] = useState<IntegrationTargetType>("webhook");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"POST" | "PUT" | "PATCH">("POST");
  const [secret, setSecret] = useState("");
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [modelMappings, setModelMappings] = useState<SheetsMappingInput[]>([]);

  const handleConnectGoogle = async () => {
    await connectSheetsOAuth({
      queryClient,
      startOAuth: () => startSheetsOAuthMutation.mutateAsync(),
    });
  };

  const handleTestSheets = async () => {
    const result = validateSheetsFormInput({
      spreadsheetInput,
      sheetName,
      modelMappings,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    try {
      const response = await testSheetsIntegrationMutation.mutateAsync(
        result.data,
      );
      toast.success(response.message ?? "Google Sheets test succeeded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Integration name is required");
      return;
    }

    if (type === "webhook") {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        toast.error("Webhook URL is required");
        return;
      }

      try {
        await createWebhookIntegrationMutation.mutateAsync({
          name: trimmedName,
          url: trimmedUrl,
          method,
          secret: secret.trim() || undefined,
        });
        toast.success("Integration created");
        await navigate({ to: "/integrations" });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
      return;
    }

    if (!pendingSheetsOAuth) {
      toast.error("Connect a Google account first");
      return;
    }

    const sheetsFormResult = validateSheetsFormInput({
      spreadsheetInput,
      sheetName,
      modelMappings,
    });
    if (!sheetsFormResult.ok) {
      toast.error(sheetsFormResult.error);
      return;
    }

    try {
      await createSheetsIntegrationMutation.mutateAsync({
        name: trimmedName,
        ...sheetsFormResult.data,
      });
      toast.success("Google Sheets integration created");
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const isSubmitting =
    createWebhookIntegrationMutation.isPending ||
    createSheetsIntegrationMutation.isPending;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/integrations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to integrations
            </Link>
          </Button>
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <PlugZap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-2xl">Create integration</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Configure where extraction results should be delivered.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType(value as IntegrationTargetType)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="sheets">Google Sheets</SelectItem>
                  <SelectItem value="postgres" disabled>
                    Postgres (soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Integration name</Label>
              <Input
                placeholder={
                  type === "sheets" ? "Finance sheet export" : "Slack alert"
                }
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {type === "webhook" ? (
              <WebhookIntegrationFields
                url={url}
                onUrlChange={setUrl}
                method={method}
                onMethodChange={setMethod}
                secret={secret}
                onSecretChange={setSecret}
                secretPlaceholder="Used to sign webhook payloads"
              />
            ) : (
              <SheetsIntegrationSection
                accountDescription="OAuth is required to write rows into your sheet."
                connectLabel={
                  pendingSheetsOAuth ? "Reconnect Google" : "Connect Google"
                }
                connectVariant={pendingSheetsOAuth ? "outline" : "default"}
                onConnectGoogle={handleConnectGoogle}
                isConnectingGoogle={startSheetsOAuthMutation.isPending}
                accountStatusText={
                  pendingSheetsOAuth
                    ? `Connected as ${pendingSheetsOAuth.accountEmail ?? "Google account"}`
                    : "No Google account connected yet."
                }
                spreadsheetInput={spreadsheetInput}
                onSpreadsheetInputChange={setSpreadsheetInput}
                sheetName={sheetName}
                onSheetNameChange={setSheetName}
                modelOptions={modelOptions}
                modelMappings={modelMappings}
                onModelMappingsChange={setModelMappings}
                onTestConnection={handleTestSheets}
                isTestingConnection={testSheetsIntegrationMutation.isPending}
              />
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create integration"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate({ to: "/integrations" })}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
