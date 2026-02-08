import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PlugZap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import type { IntegrationTargetType } from "@/lib/integrations/types";
import { useCreateWebhookIntegrationMutation } from "@/lib/query-hooks";
export const Route = createFileRoute("/_authed/integrations/new")({
  component: IntegrationCreatePage,
});

function IntegrationCreatePage() {
  const navigate = useNavigate();
  const createWebhookIntegrationMutation =
    useCreateWebhookIntegrationMutation();

  const [name, setName] = useState("");
  const [type, setType] = useState<IntegrationTargetType>("webhook");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"POST" | "PUT" | "PATCH">("POST");
  const [secret, setSecret] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Integration name is required");
      return;
    }
    if (type !== "webhook") {
      toast.error("This integration type is not available yet");
      return;
    }
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
  };

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
                  Start with a webhook and expand later.
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
                  <SelectItem value="sheets" disabled>
                    Google Sheets (soon)
                  </SelectItem>
                  <SelectItem value="postgres" disabled>
                    Postgres (soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Integration name</Label>
              <Input
                placeholder="Slack alert"
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
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreate}
                disabled={createWebhookIntegrationMutation.isPending}
              >
                {createWebhookIntegrationMutation.isPending
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
