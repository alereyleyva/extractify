import { getExtraction, listExtractions } from "@/functions/extractions";

export async function fetchExtractions() {
  return listExtractions();
}

export async function fetchExtraction(extractionId: string) {
  return getExtraction({ data: { extractionId } });
}
