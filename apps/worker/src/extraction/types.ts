export const SUPPORTED_PDF_TYPES = ["application/pdf"] as const;
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
] as const;
export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
] as const;
export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_PDF_TYPES,
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export interface ExtractionStrategy {
  extractText(fileData: ArrayBuffer, fileName: string): Promise<string>;
  supports(fileType: string): boolean;
}
