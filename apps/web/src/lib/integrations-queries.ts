import { listIntegrationTargets } from "@/functions/integrations";
import type { IntegrationTarget } from "@/lib/integrations/types";

export async function fetchIntegrationTargets(): Promise<IntegrationTarget[]> {
  const targets = await listIntegrationTargets();
  return Array.isArray(targets) ? targets : [];
}
