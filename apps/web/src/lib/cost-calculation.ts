export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type ModelPricing = {
  inputPricePer1MTokens: number;
  outputPricePer1MTokens: number;
};

const MODEL_PRICING: Record<string, ModelPricing> = {
  "qwen.qwen3-32b-v1:0": {
    inputPricePer1MTokens: 0.18,
    outputPricePer1MTokens: 0.7,
  },
};

function getModelPricing(modelId: string): ModelPricing {
  return (
    MODEL_PRICING[modelId] || {
      inputPricePer1MTokens: 0.25,
      outputPricePer1MTokens: 0.25,
    }
  );
}

export function calculateCost(
  usage: TokenUsage,
  modelId = "qwen.qwen3-32b-v1:0",
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
