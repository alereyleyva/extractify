import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SheetsMappingEditor } from "@/components/integrations/sheets-mapping-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { SheetsMappingInput } from "@/lib/integrations/types";
import {
  useDeleteIntegrationTargetMutation,
  useDisconnectSheetsOAuthMutation,
  useIntegrationQuery,
  usePendingSheetsOAuthQuery,
  useSheetsModelOptions,
  useStartSheetsOAuthMutation,
  useTestSheetsIntegrationMutation,
  useUpdateSheetsIntegrationMutation,
  useUpdateWebhookIntegrationMutation,
} from "@/lib/query-hooks";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute(
  "/_authed/integrations/$integrationId/edit",
)({
  component: IntegrationEditPage,
});

function IntegrationEditPage() {
  const { integrationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } =
    useIntegrationQuery(integrationId);
  const integration = data;

  const updateWebhookIntegrationMutation =
    useUpdateWebhookIntegrationMutation();
  const updateSheetsIntegrationMutation = useUpdateSheetsIntegrationMutation();
  const deleteIntegrationTargetMutation = useDeleteIntegrationTargetMutation();
  const testSheetsIntegrationMutation = useTestSheetsIntegrationMutation();
  const startSheetsOAuthMutation = useStartSheetsOAuthMutation();
  const disconnectSheetsOAuthMutation = useDisconnectSheetsOAuthMutation();
  const { data: pendingSheetsOauth } = usePendingSheetsOAuthQuery();
  const modelOptions = useSheetsModelOptions();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"POST" | "PUT" | "PATCH">("POST");
  const [secret, setSecret] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [modelMappings, setModelMappings] = useState<SheetsMappingInput[]>([]);
  const [shouldUsePendingOAuth, setShouldUsePendingOAuth] = useState(false);
  const [initializedIntegrationId, setInitializedIntegrationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!integration || initializedIntegrationId === integration.id) {
      return;
    }

    setName(integration.name || "");
    if (integration.type === "webhook") {
      setUrl(integration.config.url || "");
      setMethod(integration.config.method || "POST");
      setSecret("");
      setClearSecret(false);
    } else {
      setSpreadsheetInput(integration.config.spreadsheetId || "");
      setSheetName(integration.config.sheetName || "Sheet1");
      setModelMappings(integration.config.modelMappings ?? []);
      setShouldUsePendingOAuth(false);
    }

    setInitializedIntegrationId(integration.id);
  }, [initializedIntegrationId, integration]);

  useEffect(() => {
    if (
      pendingSheetsOauth &&
      integration?.type === "sheets" &&
      !integration.config.oauth?.connected
    ) {
      setShouldUsePendingOAuth(true);
    }
  }, [integration, pendingSheetsOauth]);

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
        setShouldUsePendingOAuth(true);
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
    const normalizedMappings = normalizeSheetsMappings(modelMappings);
    if (!spreadsheetInput.trim() || !sheetName.trim()) {
      toast.error("Spreadsheet and tab are required");
      return;
    }
    if (normalizedMappings.length === 0) {
      toast.error("At least one valid model mapping is required");
      return;
    }

    try {
      const result = await testSheetsIntegrationMutation.mutateAsync({
        targetId: integrationId,
        spreadsheetInput: spreadsheetInput.trim(),
        sheetName: sheetName.trim(),
        modelMappings: normalizedMappings,
        usePendingOAuth: shouldUsePendingOAuth,
      });
      toast.success(result.message ?? "Google Sheets test succeeded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSave = async () => {
    if (!integration) {
      return;
    }
    if (!name.trim()) {
      toast.error("Integration name is required");
      return;
    }

    if (integration.type === "webhook") {
      if (!url.trim()) {
        toast.error("Webhook URL is required");
        return;
      }

      try {
        await updateWebhookIntegrationMutation.mutateAsync({
          targetId: integration.id,
          name: name.trim(),
          url: url.trim(),
          method,
          secret: secret.trim() || undefined,
          clearSecret,
        });
        toast.success("Integration updated");
        await navigate({ to: "/integrations" });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
      return;
    }

    const normalizedMappings = normalizeSheetsMappings(modelMappings);
    if (!spreadsheetInput.trim() || !sheetName.trim()) {
      toast.error("Spreadsheet and tab are required");
      return;
    }
    if (normalizedMappings.length === 0) {
      toast.error("At least one valid model mapping is required");
      return;
    }

    try {
      await updateSheetsIntegrationMutation.mutateAsync({
        targetId: integration.id,
        name: name.trim(),
        spreadsheetInput: spreadsheetInput.trim(),
        sheetName: sheetName.trim(),
        modelMappings: normalizedMappings,
        usePendingOAuth: shouldUsePendingOAuth,
      });
      setShouldUsePendingOAuth(false);
      toast.success("Integration updated");
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!integration) {
      return;
    }
    try {
      await deleteIntegrationTargetMutation.mutateAsync({
        targetId: integration.id,
      });
      toast.success("Integration deleted");
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDisconnectSheetsOAuth = async () => {
    try {
      await disconnectSheetsOAuthMutation.mutateAsync({
        targetId: integrationId,
      });
      setShouldUsePendingOAuth(false);
      toast.success("Google account disconnected");
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto max-w-4xl px-6">
          <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
            <CardContent className="py-12 text-center">
              <p className="font-medium">Loading integration...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !integration) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto max-w-4xl px-6">
          <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
            <CardContent className="py-12 text-center">
              <p className="font-medium">Unable to load integration</p>
              <p className="mt-2 text-muted-foreground text-sm">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
              <Button asChild className="mt-6">
                <Link to="/integrations">Back to integrations</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete integration
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete integration</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {integration.name}
                  </span>{" "}
                  and its delivery history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete integration
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-border/40 border-b">
            <CardTitle className="text-2xl">Edit integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Integration name</Label>
              <Input
                placeholder="Integration name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {integration.type === "webhook" && (
              <>
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
                      placeholder="Leave empty to keep existing"
                      value={secret}
                      onChange={(event) => {
                        setSecret(event.target.value);
                        if (event.target.value.trim()) {
                          setClearSecret(false);
                        }
                      }}
                    />
                    <p className="text-muted-foreground text-xs">
                      {integration.hasSecret
                        ? "A secret is currently set."
                        : "No secret is set yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="clear-secret"
                    checked={clearSecret}
                    onCheckedChange={(value) => {
                      const nextChecked = value === true;
                      setClearSecret(nextChecked);
                      if (nextChecked) {
                        setSecret("");
                      }
                    }}
                  />
                  <Label htmlFor="clear-secret">Clear existing secret</Label>
                </div>
              </>
            )}

            {integration.type === "sheets" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  <p className="font-medium text-sm">Google account</p>
                  <p className="mb-3 text-muted-foreground text-xs">
                    Reconnect OAuth if you want to rotate credentials.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConnectGoogle}
                      disabled={startSheetsOAuthMutation.isPending}
                    >
                      Reconnect Google
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={handleDisconnectSheetsOAuth}
                      disabled={disconnectSheetsOAuthMutation.isPending}
                    >
                      Disconnect
                    </Button>
                    <span className="text-muted-foreground text-xs">
                      {shouldUsePendingOAuth && pendingSheetsOauth
                        ? `Using pending connection: ${
                            pendingSheetsOauth.accountEmail ?? "Google account"
                          }`
                        : integration.config.oauth?.connected
                          ? `Connected as ${
                              integration.config.oauth.accountEmail ??
                              "Google account"
                            }`
                          : "No Google account connected."}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Spreadsheet URL or ID</Label>
                    <Input
                      value={spreadsheetInput}
                      onChange={(event) =>
                        setSpreadsheetInput(event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sheet tab name</Label>
                    <Input
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
                onClick={handleSave}
                disabled={
                  updateWebhookIntegrationMutation.isPending ||
                  updateSheetsIntegrationMutation.isPending
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {updateWebhookIntegrationMutation.isPending ||
                updateSheetsIntegrationMutation.isPending
                  ? "Saving..."
                  : "Save changes"}
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
