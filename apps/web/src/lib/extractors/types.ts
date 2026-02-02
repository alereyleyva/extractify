export const SUPPORTED_PDF_TYPES = ["application/pdf"] as const;
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
] as const;
export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_PDF_TYPES,
  ...SUPPORTED_IMAGE_TYPES,
] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export interface ExtractionStrategy {
  extractText(fileData: ArrayBuffer, fileName: string): Promise<string>;
  supports(fileType: string): boolean;
}

export interface ExtractionContext {
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
}
