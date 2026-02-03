import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Globe, PlugZap, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateIntegrationTarget } from "@/functions/integrations";
import { getErrorMessage } from "@/lib/error-handling";
import type { IntegrationTarget } from "@/lib/integrations/types";
import { fetchIntegrationTargets } from "@/lib/integrations-queries";
import { requireUser } from "@/lib/route-guards";

export const Route = createFileRoute("/integrations/")({
  component: IntegrationsPage,
  loader: async () => {
    return fetchIntegrationTargets();
  },
  beforeLoad: async () => {
    const user = await requireUser();
    return { user };
  },
});

function IntegrationsPage() {
  const router = useRouter();
  const targets = (Route.useLoaderData() as IntegrationTarget[]) ?? [];
  const updateIntegrationTargetFn = useServerFn(updateIntegrationTarget);

  const handleToggle = async (target: IntegrationTarget) => {
    try {
      await updateIntegrationTargetFn({
        data: {
          targetId: target.id,
          enabled: !target.enabled,
        },
      });
      await router.invalidate();
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
          {targets.length === 0 ? (
            <Card className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PlugZap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">No integrations yet</p>
                  <p className="text-muted-foreground text-sm">
                    Create a webhook to receive extraction results.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/integrations/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create integration
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {targets.map((target) => (
                <Card
                  key={target.id}
                  className="border-0 bg-card/40 shadow-sm ring-1 ring-border/40"
                >
                  <CardContent className="flex h-full flex-col justify-between gap-4 py-6">
                    <div>
                      <p className="font-semibold">{target.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {target.type.toUpperCase()}
                        {target.config.method
                          ? ` · ${target.config.method}`
                          : ""}
                      </p>
                      {target.config.url && (
                        <p className="mt-1 break-all text-muted-foreground text-xs">
                          {target.config.url}
                        </p>
                      )}
                      {target.hasSecret && (
                        <p className="mt-1 text-muted-foreground text-xs">
                          Signing secret set
                        </p>
                      )}
                    </div>
                    <Button
                      variant={target.enabled ? "outline" : "default"}
                      onClick={() => handleToggle(target)}
                    >
                      {target.enabled ? "Disable" : "Enable"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
