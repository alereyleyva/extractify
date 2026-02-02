import {
  getActiveModelVersion,
  getModel,
  listModels,
} from "@/functions/models";

export async function fetchModels() {
  return listModels();
}

export async function fetchModel(modelId: string) {
  return getModel({ data: { modelId } });
}

export async function fetchActiveModelVersion(modelId: string) {
  return getActiveModelVersion({ data: { modelId } });
}
