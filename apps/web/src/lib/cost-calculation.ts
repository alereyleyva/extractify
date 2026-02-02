import {
  DEFAULT_LLM_MODEL_ID,
  type LlmModelId,
  MODEL_PRICING,
  type ModelPricing,
} from "@/lib/llm-models";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function getModelPricing(modelId: string): ModelPricing {
  return (
    MODEL_PRICING[modelId as LlmModelId] || {
      inputPricePer1MTokens: 0.25,
      outputPricePer1MTokens: 0.25,
    }
  );
}

export function calculateCost(
  usage: TokenUsage,
  modelId = DEFAULT_LLM_MODEL_ID,
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
} {
  const pricing = getModelPricing(modelId);

  const inputCost =
    (usage.inputTokens / 1_000_000) * pricing.inputPricePer1MTokens;
  const outputCost =
    (usage.outputTokens / 1_000_000) * pricing.outputPricePer1MTokens;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
  };
}

export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}
