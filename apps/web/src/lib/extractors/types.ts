export type SupportedFileType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/jpg";

export interface ExtractionStrategy {
  extractText(fileData: ArrayBuffer, fileName: string): Promise<string>;
  supports(fileType: string): boolean;
}

export interface ExtractionContext {
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
}
