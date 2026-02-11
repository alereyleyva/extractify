import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PlugZap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SheetsMappingEditor } from "@/components/integrations/sheets-mapping-editor";
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
import { normalizeSheetsMappings } from "@/lib/integrations/sheets-mapping";
import { openSheetsOAuthPopup } from "@/lib/integrations/sheets-oauth-popup";
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
import { queryKeys } from "@/lib/query-keys";

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
  const { data: pendingSheetsOauth } = usePendingSheetsOAuthQuery();
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
    try {
      const result = await startSheetsOAuthMutation.mutateAsync();
      if (!result?.url) {
        throw new Error("Unable to start OAuth flow");
      }
      const oauthResult = await openSheetsOAuthPopup(result.url);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pendingSheetsOAuth,
      });

      if (oauthResult.status === "connected") {
        toast.success(
          oauthResult.accountEmail
            ? `Connected as ${oauthResult.accountEmail}`
            : "Google account connected",
        );
        return;
      }

      if (oauthResult.status === "closed") {
        return;
      }

      if (oauthResult.reason === "popup_blocked") {
        toast.error("Popup blocked. Please allow popups and try again.");
        return;
      }

      toast.error(
        oauthResult.reason
          ? `OAuth failed: ${oauthResult.reason}`
          : "OAuth failed",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleTestSheets = async () => {
    if (!spreadsheetInput.trim()) {
      toast.error("Spreadsheet URL or ID is required");
      return;
    }
    if (!sheetName.trim()) {
      toast.error("Sheet tab name is required");
      return;
    }
    const normalizedMappings = normalizeSheetsMappings(modelMappings);
    if (normalizedMappings.length === 0) {
      toast.error("At least one valid model mapping is required");
      return;
    }
    try {
      const result = await testSheetsIntegrationMutation.mutateAsync({
        spreadsheetInput: spreadsheetInput.trim(),
        sheetName: sheetName.trim(),
        modelMappings: normalizedMappings,
      });
      toast.success(result.message ?? "Google Sheets test succeeded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Integration name is required");
      return;
    }

    if (type === "webhook") {
      if (!url.trim()) {
        toast.error("Webhook URL is required");
        return;
      }

      try {
        await createWebhookIntegrationMutation.mutateAsync({
          name: name.trim(),
          url: url.trim(),
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

    if (!pendingSheetsOauth) {
      toast.error("Connect a Google account first");
      return;
    }

    if (!spreadsheetInput.trim()) {
      toast.error("Spreadsheet URL or ID is required");
      return;
    }

    if (!sheetName.trim()) {
      toast.error("Sheet tab name is required");
      return;
    }

    const normalizedMappings = normalizeSheetsMappings(modelMappings);
    if (normalizedMappings.length === 0) {
      toast.error("At least one valid model mapping is required");
      return;
    }

    try {
      await createSheetsIntegrationMutation.mutateAsync({
        name: name.trim(),
        spreadsheetInput: spreadsheetInput.trim(),
        sheetName: sheetName.trim(),
        modelMappings: normalizedMappings,
      });
      toast.success("Google Sheets integration created");
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

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

            {type === "webhook" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://hooks.example.com/extractify"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={method}
                      onValueChange={(value) =>
                        setMethod(value as "POST" | "PUT" | "PATCH")
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Signing secret (optional)</Label>
                    <Input
                      placeholder="Used to sign webhook payloads"
                      value={secret}
                      onChange={(event) => setSecret(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {type === "sheets" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="font-medium text-sm">Google account</p>
                  <p className="mb-3 text-muted-foreground text-xs">
                    OAuth is required to write rows into your sheet.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={pendingSheetsOauth ? "outline" : "default"}
                      onClick={handleConnectGoogle}
                      disabled={startSheetsOAuthMutation.isPending}
                    >
                      {pendingSheetsOauth
                        ? "Reconnect Google"
                        : "Connect Google"}
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      {pendingSheetsOauth
                        ? `Connected as ${
                            pendingSheetsOauth.accountEmail ?? "Google account"
                          }`
                        : "No Google account connected yet."}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Spreadsheet URL or ID</Label>
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={spreadsheetInput}
                      onChange={(event) =>
                        setSpreadsheetInput(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sheet tab name</Label>
                    <Input
                      placeholder="Sheet1"
                      value={sheetName}
                      onChange={(event) => setSheetName(event.target.value)}
                    />
                  </div>
                </div>

                <SheetsMappingEditor
                  modelOptions={modelOptions}
                  value={modelMappings}
                  onChange={setModelMappings}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestSheets}
                    disabled={testSheetsIntegrationMutation.isPending}
                  >
                    {testSheetsIntegrationMutation.isPending
                      ? "Testing..."
                      : "Test connection"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreate}
                disabled={
                  createWebhookIntegrationMutation.isPending ||
                  createSheetsIntegrationMutation.isPending
                }
              >
                {createWebhookIntegrationMutation.isPending ||
                createSheetsIntegrationMutation.isPending
                  ? "Creating..."
                  : "Create integration"}
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
