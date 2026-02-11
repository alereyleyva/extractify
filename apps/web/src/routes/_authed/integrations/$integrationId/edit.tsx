import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SheetsIntegrationSection } from "@/components/integrations/sheets-integration-section";
import { WebhookIntegrationFields } from "@/components/integrations/webhook-integration-fields";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/error-handling";
import { validateSheetsFormInput } from "@/lib/integrations/sheets-form";
import { connectSheetsOAuth } from "@/lib/integrations/sheets-oauth";
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

export const Route = createFileRoute(
  "/_authed/integrations/$integrationId/edit",
)({
  component: IntegrationEditPage,
});

function IntegrationEditPage() {
  const { integrationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: integration,
    isLoading,
    isError,
    error,
  } = useIntegrationQuery(integrationId);

  const updateWebhookIntegrationMutation =
    useUpdateWebhookIntegrationMutation();
  const updateSheetsIntegrationMutation = useUpdateSheetsIntegrationMutation();
  const deleteIntegrationTargetMutation = useDeleteIntegrationTargetMutation();
  const testSheetsIntegrationMutation = useTestSheetsIntegrationMutation();
  const startSheetsOAuthMutation = useStartSheetsOAuthMutation();
  const disconnectSheetsOAuthMutation = useDisconnectSheetsOAuthMutation();

  const { data: pendingSheetsOAuth } = usePendingSheetsOAuthQuery();
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
      pendingSheetsOAuth &&
      integration?.type === "sheets" &&
      !integration.config.oauth?.connected
    ) {
      setShouldUsePendingOAuth(true);
    }
  }, [integration, pendingSheetsOAuth]);

  const handleConnectGoogle = async () => {
    await connectSheetsOAuth({
      queryClient,
      startOAuth: () => startSheetsOAuthMutation.mutateAsync(),
      onConnected: () => setShouldUsePendingOAuth(true),
    });
  };

  const handleTestSheets = async () => {
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
      const result = await testSheetsIntegrationMutation.mutateAsync({
        targetId: integrationId,
        ...sheetsFormResult.data,
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

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Integration name is required");
      return;
    }

    if (integration.type === "webhook") {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        toast.error("Webhook URL is required");
        return;
      }

      try {
        await updateWebhookIntegrationMutation.mutateAsync({
          targetId: integration.id,
          name: trimmedName,
          url: trimmedUrl,
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
      await updateSheetsIntegrationMutation.mutateAsync({
        targetId: integration.id,
        name: trimmedName,
        ...sheetsFormResult.data,
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

  const isSaving =
    updateWebhookIntegrationMutation.isPending ||
    updateSheetsIntegrationMutation.isPending;

  const sheetsAccountStatusText =
    integration.type !== "sheets"
      ? ""
      : shouldUsePendingOAuth && pendingSheetsOAuth
        ? `Using pending connection: ${pendingSheetsOAuth.accountEmail ?? "Google account"}`
        : integration.config.oauth?.connected
          ? `Connected as ${integration.config.oauth.accountEmail ?? "Google account"}`
          : "No Google account connected.";

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

            {integration.type === "webhook" ? (
              <WebhookIntegrationFields
                url={url}
                onUrlChange={setUrl}
                method={method}
                onMethodChange={setMethod}
                secret={secret}
                onSecretChange={(value) => {
                  setSecret(value);
                  if (value.trim()) {
                    setClearSecret(false);
                  }
                }}
                secretPlaceholder="Leave empty to keep existing"
                hasSecret={integration.hasSecret}
                clearSecret={clearSecret}
                onClearSecretChange={(nextChecked) => {
                  setClearSecret(nextChecked);
                  if (nextChecked) {
                    setSecret("");
                  }
                }}
              />
            ) : (
              <SheetsIntegrationSection
                accountDescription="Reconnect OAuth if you want to rotate credentials."
                connectLabel="Reconnect Google"
                connectVariant="outline"
                onConnectGoogle={handleConnectGoogle}
                isConnectingGoogle={startSheetsOAuthMutation.isPending}
                onDisconnectGoogle={handleDisconnectSheetsOAuth}
                isDisconnectingGoogle={disconnectSheetsOAuthMutation.isPending}
                accountStatusText={sheetsAccountStatusText}
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
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save changes"}
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
