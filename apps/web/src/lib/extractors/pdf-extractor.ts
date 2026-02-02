import { PDFParse } from "pdf-parse";
import { type ExtractionStrategy, SUPPORTED_PDF_TYPES } from "./types";

export class PDFExtractionStrategy implements ExtractionStrategy {
  supports(fileType: string): boolean {
    return SUPPORTED_PDF_TYPES.includes(
      fileType as (typeof SUPPORTED_PDF_TYPES)[number],
    );
  }

  async extractText(fileData: ArrayBuffer, _fileName: string): Promise<string> {
    const parser = new PDFParse({ data: Buffer.from(fileData) });
    const textResult = await parser.getText();

    return textResult.text;
  }
}
