import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, PlugZap, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { IntegrationsListSkeleton } from "@/components/skeletons/integrations-skeletons";
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
import { getErrorMessage } from "@/lib/error-handling";
import type { IntegrationTarget } from "@/lib/integrations/types";
import {
  useDeleteIntegrationTargetMutation,
  useIntegrationsQuery,
  useUpdateIntegrationTargetMutation,
} from "@/lib/query-hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/integrations/")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { data, isLoading } = useIntegrationsQuery();
  const targets = data ?? [];
  const updateIntegrationTargetMutation = useUpdateIntegrationTargetMutation();
  const deleteIntegrationTargetMutation = useDeleteIntegrationTargetMutation();

  const handleToggle = async (target: IntegrationTarget) => {
    try {
      await updateIntegrationTargetMutation.mutateAsync({
        targetId: target.id,
        enabled: !target.enabled,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (target: IntegrationTarget) => {
    try {
      await deleteIntegrationTargetMutation.mutateAsync({
        targetId: target.id,
      });
      toast.success("Integration deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PlugZap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-2xl">Integrations</h1>
            <p className="text-muted-foreground text-sm">
              Connect destinations to receive extraction results.
            </p>
          </div>
          <Button asChild className="ml-auto">
            <Link to="/integrations/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New integration
            </Link>
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Globe className="h-4 w-4" />
            {targets.length === 0 ? "No integrations yet" : "Your integrations"}
          </div>
          {isLoading ? (
            <IntegrationsListSkeleton />
          ) : targets.length === 0 ? (
            <div className="rounded-2xl border border-border/60 border-dashed bg-card/30 p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PlugZap className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="font-semibold">No integrations yet</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Create a webhook or Google Sheets target to receive extraction
                  results.
                </p>
              </div>
              <Button asChild className="mt-5">
                <Link to="/integrations/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create integration
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
              <div className="divide-y divide-border/40">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{target.name}</p>
                        <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              target.enabled
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                            )}
                          />
                          {target.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                        <span className="rounded-full border border-border/60 px-2 py-0.5">
                          {target.type.toUpperCase()}
                        </span>
                        {target.type === "webhook" && target.config.method && (
                          <span className="rounded-full border border-border/60 px-2 py-0.5">
                            {target.config.method}
                          </span>
                        )}
                        {target.type === "webhook" && target.hasSecret && (
                          <span className="rounded-full border border-border/60 px-2 py-0.5">
                            Signing secret
                          </span>
                        )}
                        {target.type === "sheets" &&
                          target.config.sheetName && (
                            <span className="rounded-full border border-border/60 px-2 py-0.5">
                              Tab: {target.config.sheetName}
                            </span>
                          )}
                        {target.type === "sheets" && target.config.oauth && (
                          <span className="rounded-full border border-border/60 px-2 py-0.5">
                            {target.config.oauth.connected
                              ? `Google: ${
                                  target.config.oauth.accountEmail ??
                                  "Connected"
                                }`
                              : "Google: Not connected"}
                          </span>
                        )}
                      </div>
                      {target.type === "webhook" && target.config.url && (
                        <p className="break-all text-muted-foreground text-xs">
                          {target.config.url}
                        </p>
                      )}
                      {target.type === "sheets" &&
                        target.config.spreadsheetId && (
                          <p className="break-all text-muted-foreground text-xs">
                            Spreadsheet: {target.config.spreadsheetId}
                          </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          to="/integrations/$integrationId/edit"
                          params={{ integrationId: target.id }}
                        >
                          Edit
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete integration
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete{" "}
                              <span className="font-medium text-foreground">
                                {target.name}
                              </span>{" "}
                              and its delivery history. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => handleDelete(target)}
                            >
                              Delete integration
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        size="sm"
                        variant={target.enabled ? "outline" : "default"}
                        onClick={() => handleToggle(target)}
                      >
                        {target.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
