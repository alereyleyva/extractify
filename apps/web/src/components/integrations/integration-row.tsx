import { Link } from "@tanstack/react-router";
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
import type { IntegrationTarget } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

function IntegrationBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/60 px-2 py-0.5">
      {label}
    </span>
  );
}

function getSheetsOAuthLabel(target: IntegrationTarget): string | null {
  if (target.type !== "sheets" || !target.config.oauth) {
    return null;
  }

  return target.config.oauth.connected
    ? `Google: ${target.config.oauth.accountEmail ?? "Connected"}`
    : "Google: Not connected";
}

function getIntegrationDetail(target: IntegrationTarget): string | null {
  if (target.type === "webhook") {
    return target.config.url || null;
  }

  if (target.type === "sheets") {
    return target.config.spreadsheetId
      ? `Spreadsheet: ${target.config.spreadsheetId}`
      : null;
  }

  return null;
}

type IntegrationRowProps = {
  target: IntegrationTarget;
  onToggle: (target: IntegrationTarget) => void;
  onDelete: (target: IntegrationTarget) => void;
};

export function IntegrationRow({
  target,
  onToggle,
  onDelete,
}: IntegrationRowProps) {
  const oauthLabel = getSheetsOAuthLabel(target);
  const detail = getIntegrationDetail(target);

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{target.name}</p>
          <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                target.enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
            {target.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <IntegrationBadge label={target.type.toUpperCase()} />
          {target.type === "webhook" && target.config.method ? (
            <IntegrationBadge label={target.config.method} />
          ) : null}
          {target.type === "webhook" && target.hasSecret ? (
            <IntegrationBadge label="Signing secret" />
          ) : null}
          {target.type === "sheets" && target.config.sheetName ? (
            <IntegrationBadge label={`Tab: ${target.config.sheetName}`} />
          ) : null}
          {oauthLabel ? <IntegrationBadge label={oauthLabel} /> : null}
        </div>

        {detail ? (
          <p className="break-all text-muted-foreground text-xs">{detail}</p>
        ) : null}
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
              <AlertDialogTitle>Delete integration</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {target.name}
                </span>{" "}
                and its delivery history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => onDelete(target)}
              >
                Delete integration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="sm"
          variant={target.enabled ? "outline" : "default"}
          onClick={() => onToggle(target)}
        >
          {target.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </div>
  );
}
