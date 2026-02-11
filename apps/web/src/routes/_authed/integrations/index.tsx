import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, PlugZap, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { IntegrationRow } from "@/components/integrations/integration-row";
import { IntegrationsListSkeleton } from "@/components/skeletons/integrations-skeletons";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-handling";
import type { IntegrationTarget } from "@/lib/integrations/types";
import {
  useDeleteIntegrationTargetMutation,
  useIntegrationsQuery,
  useUpdateIntegrationTargetMutation,
} from "@/lib/query-hooks";

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
                  <IntegrationRow
                    key={target.id}
                    target={target}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
