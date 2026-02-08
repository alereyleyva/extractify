import type { AttributeInput } from "@extractify/shared/attribute-model";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { extractDataFromModel } from "@/functions/extract-data";
import { getExtraction, listExtractions } from "@/functions/extractions";
import { getCurrentUser } from "@/functions/get-current-user";
import {
  createWebhookIntegration,
  deleteIntegrationTarget,
  getIntegrationTarget,
  listIntegrationTargets,
  updateIntegrationTarget,
  updateWebhookIntegration,
} from "@/functions/integrations";
import {
  createModel,
  createModelVersion,
  deleteModel,
  getActiveModelVersion,
  getModel,
  listModels,
  setActiveModelVersion,
  updateModel,
  updateModelVersion,
} from "@/functions/models";
import type {
  ExtractionDetail,
  ExtractionInput,
  ExtractionSummary,
} from "@/lib/extractions-types";
import type { IntegrationTarget } from "@/lib/integrations/types";
import type { LlmModelId } from "@/lib/llm-models";
import { queryKeys } from "@/lib/query-keys";

export const mutationKeys = {
  createModel: ["models", "create"] as const,
  updateModel: ["models", "update"] as const,
  deleteModel: ["models", "delete"] as const,
  createModelVersion: ["models", "versions", "create"] as const,
  updateModelVersion: ["models", "versions", "update"] as const,
  setActiveModelVersion: ["models", "versions", "set-active"] as const,
  createIntegration: ["integrations", "create"] as const,
  updateIntegration: ["integrations", "update"] as const,
  updateIntegrationTarget: ["integrations", "toggle"] as const,
  deleteIntegration: ["integrations", "delete"] as const,
  extractData: ["extractions", "create"] as const,
};

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

export const modelsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.models,
    queryFn: listModels,
  });

export const modelQueryOptions = (modelId: string) =>
  queryOptions({
    queryKey: queryKeys.model(modelId),
    queryFn: () => getModel({ data: { modelId } }),
  });

export const activeModelVersionQueryOptions = (modelId: string) =>
  queryOptions({
    queryKey: queryKeys.activeModelVersion(modelId),
    queryFn: () => getActiveModelVersion({ data: { modelId } }),
  });

export const historyQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.history,
    queryFn: listExtractions,
  });

export const extractionQueryOptions = (extractionId: string) =>
  queryOptions({
    queryKey: queryKeys.extraction(extractionId),
    queryFn: () => getExtraction({ data: { extractionId } }),
    staleTime: 5_000,
  });

export const integrationsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.integrations,
    queryFn: async (): Promise<IntegrationTarget[]> => {
      const targets = await listIntegrationTargets();
      return Array.isArray(targets) ? targets : [];
    },
  });

export const integrationQueryOptions = (integrationId: string) =>
  queryOptions({
    queryKey: queryKeys.integration(integrationId),
    queryFn: () => getIntegrationTarget({ data: { targetId: integrationId } }),
  });

export function useModelsQuery() {
  return useQuery(modelsQueryOptions());
}

export function useCurrentUserQuery() {
  return useQuery(currentUserQueryOptions());
}

export function useModelQuery(modelId: string | undefined | null) {
  return useQuery({
    ...modelQueryOptions(modelId ?? ""),
    enabled: !!modelId,
  });
}

export function useActiveModelVersionQuery(modelId: string | undefined | null) {
  return useQuery({
    ...activeModelVersionQueryOptions(modelId ?? ""),
    enabled: !!modelId,
  });
}

export function useHistoryQuery() {
  return useQuery(historyQueryOptions());
}

export function useExtractionQuery(
  extractionId: string | undefined | null,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    ...extractionQueryOptions(extractionId ?? ""),
    enabled: !!extractionId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useIntegrationsQuery() {
  return useQuery(integrationsQueryOptions());
}

export function useIntegrationQuery(integrationId: string | undefined | null) {
  return useQuery({
    ...integrationQueryOptions(integrationId ?? ""),
    enabled: !!integrationId,
  });
}

export function usePrefetchModel() {
  const queryClient = useQueryClient();

  return (modelId: string) =>
    queryClient.prefetchQuery(modelQueryOptions(modelId));
}

export function usePrefetchExtraction() {
  const queryClient = useQueryClient();

  return (extractionId: string) =>
    queryClient.prefetchQuery(extractionQueryOptions(extractionId));
}

type CreateModelInput = {
  name: string;
  description?: string;
  attributes: AttributeInput[];
  changelog?: string;
};

type UpdateModelInput = {
  modelId: string;
  name?: string;
  description?: string | null;
};

type DeleteModelInput = {
  modelId: string;
};

type CreateModelVersionInput = {
  modelId: string;
  attributes: AttributeInput[];
  changelog?: string;
  setActive?: boolean;
};

type UpdateModelVersionInput = {
  versionId: string;
  attributes?: AttributeInput[];
  changelog?: string | null;
  setActive?: boolean;
  modelId?: string;
};

type SetActiveModelVersionInput = {
  versionId: string;
  modelId?: string;
};

type CreateWebhookIntegrationInput = {
  name: string;
  url: string;
  method: "POST" | "PUT" | "PATCH";
  secret?: string;
};

type UpdateWebhookIntegrationInput = {
  targetId: string;
  name?: string;
  url?: string;
  method?: "POST" | "PUT" | "PATCH";
  secret?: string;
  clearSecret?: boolean;
};

type UpdateIntegrationTargetInput = {
  targetId: string;
  name?: string;
  enabled?: boolean;
};

type DeleteIntegrationTargetInput = {
  targetId: string;
};

type ExtractDataVariables = {
  extractionId: string;
  modelId: string;
  modelName: string;
  modelVersionId?: string | null;
  modelVersionNumber?: number | null;
  llmModelId: LlmModelId;
  files: File[];
  integrationTargetIds?: string[];
};

type ExtractDataContext = {
  previousHistory?: ExtractionSummary[];
  extractionId: string;
};

function buildOptimisticInputs(
  files: File[],
  extractionId: string,
): ExtractionInput[] {
  return files.map((file, index) => ({
    id: `optimistic-${extractionId}-${index}`,
    fileName: file.name || `upload-${index + 1}`,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    sourceOrder: index,
  }));
}

export function useCreateModelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createModel,
    mutationFn: (input: CreateModelInput) => createModel({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

export function useUpdateModelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateModel,
    mutationFn: (input: UpdateModelInput) => updateModel({ data: input }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.model(variables.modelId),
      });
    },
  });
}

export function useDeleteModelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteModel,
    mutationFn: (input: DeleteModelInput) => deleteModel({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

export function useCreateModelVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createModelVersion,
    mutationFn: (input: CreateModelVersionInput) =>
      createModelVersion({ data: input }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.model(variables.modelId),
      });
    },
  });
}

export function useUpdateModelVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateModelVersion,
    mutationFn: (input: UpdateModelVersionInput) =>
      updateModelVersion({
        data: {
          versionId: input.versionId,
          attributes: input.attributes,
          changelog: input.changelog,
          setActive: input.setActive,
        },
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      if (variables.modelId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.model(variables.modelId),
        });
      }
    },
  });
}

export function useSetActiveModelVersionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.setActiveModelVersion,
    mutationFn: (input: SetActiveModelVersionInput) =>
      setActiveModelVersion({ data: { versionId: input.versionId } }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.models });
      if (variables.modelId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.model(variables.modelId),
        });
      }
    },
  });
}

export function useCreateWebhookIntegrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createIntegration,
    mutationFn: (input: CreateWebhookIntegrationInput) =>
      createWebhookIntegration({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
}

export function useUpdateWebhookIntegrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateIntegration,
    mutationFn: (input: UpdateWebhookIntegrationInput) =>
      updateWebhookIntegration({ data: input }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integration(variables.targetId),
      });
    },
  });
}

export function useUpdateIntegrationTargetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateIntegrationTarget,
    mutationFn: (input: UpdateIntegrationTargetInput) =>
      updateIntegrationTarget({ data: input }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integration(variables.targetId),
      });
    },
  });
}

export function useDeleteIntegrationTargetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteIntegration,
    mutationFn: (input: DeleteIntegrationTargetInput) =>
      deleteIntegrationTarget({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
}

export function useExtractDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.extractData,
    mutationFn: async (variables: ExtractDataVariables) => {
      const formData = new FormData();
      formData.append("extractionId", variables.extractionId);
      formData.append("modelId", variables.modelId);
      formData.append("llmModelId", variables.llmModelId);
      (variables.integrationTargetIds ?? []).forEach((id) => {
        formData.append("integrationTargetIds", id);
      });
      variables.files.forEach((file) => {
        formData.append("files", file, file.name);
      });
      return extractDataFromModel({ data: formData });
    },
    onMutate: async (variables): Promise<ExtractDataContext> => {
      const extractionId = variables.extractionId;
      await queryClient.cancelQueries({ queryKey: queryKeys.history });
      await queryClient.cancelQueries({
        queryKey: queryKeys.extraction(extractionId),
      });

      const previousHistory = queryClient.getQueryData<ExtractionSummary[]>(
        queryKeys.history,
      );

      const createdAt = new Date().toISOString();
      const optimisticSummary: ExtractionSummary = {
        id: extractionId,
        status: "processing",
        modelId: variables.modelId,
        modelName: variables.modelName,
        modelVersionNumber: variables.modelVersionNumber ?? null,
        llmModelId: variables.llmModelId,
        createdAt,
        completedAt: null,
      };

      queryClient.setQueryData<ExtractionSummary[]>(
        queryKeys.history,
        (current) => {
          const next = current ? [...current] : [];
          if (!next.some((run) => run.id === extractionId)) {
            next.unshift(optimisticSummary);
          }
          return next;
        },
      );

      queryClient.setQueryData<ExtractionDetail>(
        queryKeys.extraction(extractionId),
        (current) => {
          if (current) {
            return current;
          }
          return {
            id: extractionId,
            status: "processing",
            modelId: variables.modelId,
            modelName: variables.modelName,
            modelVersionId: variables.modelVersionId ?? "pending",
            modelVersionNumber: variables.modelVersionNumber ?? null,
            llmModelId: variables.llmModelId,
            createdAt,
            completedAt: null,
            result: null,
            usage: null,
            errorMessage: null,
            inputs: buildOptimisticInputs(variables.files, extractionId),
            integrationDeliveries: [],
          };
        },
      );

      return { previousHistory, extractionId };
    },
    onError: (_error, _variables, onMutateResult) => {
      if (!onMutateResult) {
        return;
      }
      queryClient.setQueryData(
        queryKeys.history,
        onMutateResult.previousHistory,
      );
      queryClient.removeQueries({
        queryKey: queryKeys.extraction(onMutateResult.extractionId),
      });
    },
    onSuccess: async (data, variables) => {
      const extractionId =
        data && typeof data === "object" && "extractionId" in data
          ? (data.extractionId as string)
          : variables.extractionId;

      await queryClient.invalidateQueries({ queryKey: queryKeys.history });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.extraction(extractionId),
      });
    },
  });
}
