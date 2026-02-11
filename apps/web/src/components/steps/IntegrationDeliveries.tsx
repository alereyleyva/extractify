import type { IntegrationDeliveryResult } from "@/lib/integrations/types";

export function IntegrationDeliveries({
  deliveries,
}: {
  deliveries: IntegrationDeliveryResult[];
}) {
  if (deliveries.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-card/70 p-4">
      <p className="font-medium text-sm">Integrations</p>
      <div className="mt-3 space-y-2">
        {deliveries.map((delivery) => (
          <div
            key={delivery.targetId}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{delivery.name}</p>
              <p className="text-muted-foreground text-xs">
                {delivery.type.toUpperCase()}
                {delivery.responseStatus ? ` · ${delivery.responseStatus}` : ""}
              </p>
              {delivery.errorMessage ? (
                <p className="text-rose-600 text-xs">{delivery.errorMessage}</p>
              ) : null}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                delivery.status === "succeeded"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              {delivery.status === "succeeded" ? "Delivered" : "Failed"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
