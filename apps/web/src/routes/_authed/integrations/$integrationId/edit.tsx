import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  deleteIntegrationTarget,
  updateWebhookIntegration,
} from "@/functions/integrations";
import { getErrorMessage } from "@/lib/error-handling";
import type { IntegrationTarget } from "@/lib/integrations/types";
import { useIntegrationQuery } from "@/lib/query-hooks";
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
  const integration = data as IntegrationTarget | undefined;
  const updateWebhookIntegrationFn = useServerFn(updateWebhookIntegration);
  const deleteIntegrationTargetFn = useServerFn(deleteIntegrationTarget);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"POST" | "PUT" | "PATCH">("POST");
  const [secret, setSecret] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(integration?.name || "");
    setUrl(integration?.config.url || "");
    setMethod(integration?.config.method || "POST");
    setSecret("");
    setClearSecret(false);
  }, [integration]);

  const handleSave = async () => {
    if (!integration) {
      return;
    }
    if (!name.trim()) {
      toast.error("Integration name is required");
      return;
    }
    if (!url.trim()) {
      toast.error("Webhook URL is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateWebhookIntegrationFn({
        data: {
          targetId: integration.id,
          name: name.trim(),
          url: url.trim(),
          method,
          secret: secret.trim() || undefined,
          clearSecret,
        },
      });
      toast.success("Integration updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integration(integration.id),
      });
      await navigate({ to: "/integrations" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!integration) {
      return;
    }
    try {
      await deleteIntegrationTargetFn({ data: { targetId: integration.id } });
      toast.success("Integration deleted");
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
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
      <div className="container mx-auto max-w-4xl px-6">
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
                placeholder="Slack alert"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
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
