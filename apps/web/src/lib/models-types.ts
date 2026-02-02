import type { AttributeInput } from "@extractify/shared/attribute-model";

export type ModelSummary = {
  id: string;
  name: string;
  description?: string | null;
  updatedAt?: string | Date | null;
  activeVersion?: {
    versionNumber: number;
  } | null;
  latestVersionNumber: number;
  versionCount: number;
};

export type ModelVersion = {
  id: string;
  versionNumber: number;
  isActive: boolean;
  attributes: AttributeInput[];
  changelog?: string | null;
  createdAt?: string | Date | null;
};

export type ModelDetail = {
  id: string;
  name: string;
  description?: string | null;
  versions: ModelVersion[];
};
