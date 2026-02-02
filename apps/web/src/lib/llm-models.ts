export type ModelPricing = {
  inputPricePer1MTokens: number;
  outputPricePer1MTokens: number;
};

export const LLM_MODELS = [
  {
    id: "qwen.qwen3-32b-v1:0",
    label: "Qwen 3 32B",
  },
  {
    id: "eu.amazon.nova-pro-v1:0",
    label: "Amazon Nova Pro",
  },
  {
    id: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    label: "Claude Sonnet 4.5",
  },
] as const;

export type LlmModelId = (typeof LLM_MODELS)[number]["id"];

export const LLM_MODEL_ID_LIST = LLM_MODELS.map((model) => model.id) as [
  LlmModelId,
  ...LlmModelId[],
];

export const DEFAULT_LLM_MODEL_ID: LlmModelId = "eu.amazon.nova-pro-v1:0";

export const MODEL_PRICING: Record<LlmModelId, ModelPricing> = {
  "qwen.qwen3-32b-v1:0": {
    inputPricePer1MTokens: 0.18,
    outputPricePer1MTokens: 0.7,
  },
  "eu.amazon.nova-pro-v1:0": {
    inputPricePer1MTokens: 0.92,
    outputPricePer1MTokens: 3.68,
  },
  "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": {
    inputPricePer1MTokens: 3,
    outputPricePer1MTokens: 15,
  },
};
