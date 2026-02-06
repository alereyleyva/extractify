import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/functions/get-current-user";
import { fetchExtraction, fetchExtractions } from "@/lib/extractions-queries";
import {
  fetchIntegrationTarget,
  fetchIntegrationTargets,
} from "@/lib/integrations-queries";
import {
  fetchActiveModelVersion,
  fetchModel,
  fetchModels,
} from "@/lib/models-queries";
import { queryKeys } from "@/lib/query-keys";

export function useModelsQuery() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: fetchModels,
  });
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });
}

export function useModelQuery(modelId: string | undefined | null) {
  return useQuery({
    queryKey: modelId ? queryKeys.model(modelId) : queryKeys.models,
    queryFn: () => fetchModel(modelId || ""),
    enabled: !!modelId,
  });
}

export function useActiveModelVersionQuery(modelId: string | undefined | null) {
  return useQuery({
    queryKey: modelId
      ? queryKeys.activeModelVersion(modelId)
      : queryKeys.models,
    queryFn: () => fetchActiveModelVersion(modelId || ""),
    enabled: !!modelId,
  });
}

export function useHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: fetchExtractions,
  });
}

export function useExtractionQuery(
  extractionId: string | undefined | null,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: extractionId
      ? queryKeys.extraction(extractionId)
      : queryKeys.history,
    queryFn: () => fetchExtraction(extractionId || ""),
    enabled: !!extractionId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useIntegrationsQuery() {
  return useQuery({
    queryKey: queryKeys.integrations,
    queryFn: fetchIntegrationTargets,
  });
}

export function useIntegrationQuery(integrationId: string | undefined | null) {
  return useQuery({
    queryKey: integrationId
      ? queryKeys.integration(integrationId)
      : queryKeys.integrations,
    queryFn: () => fetchIntegrationTarget(integrationId || ""),
    enabled: !!integrationId,
  });
}

export function usePrefetchModel() {
  const queryClient = useQueryClient();

  return (modelId: string) =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.model(modelId),
      queryFn: () => fetchModel(modelId),
    });
}

export function usePrefetchExtraction() {
  const queryClient = useQueryClient();

  return (extractionId: string) =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.extraction(extractionId),
      queryFn: () => fetchExtraction(extractionId),
    });
}
