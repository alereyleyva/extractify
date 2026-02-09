import { extractText } from "unpdf";
import { type ExtractionStrategy, SUPPORTED_PDF_TYPES } from "./types";

export class PDFExtractionStrategy implements ExtractionStrategy {
  supports(fileType: string): boolean {
    return SUPPORTED_PDF_TYPES.includes(
      fileType as (typeof SUPPORTED_PDF_TYPES)[number],
    );
  }

  async extractText(
    fileData: ArrayBuffer,
    _fileName: string,
    _fileUrl?: string,
  ): Promise<string> {
    const { text } = await extractText(fileData, { mergePages: true });

    return text;
  }
}
