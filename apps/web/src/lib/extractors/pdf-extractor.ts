import { PDFParse } from "pdf-parse";
import type { ExtractionStrategy } from "./types";

export class PDFExtractionStrategy implements ExtractionStrategy {
  supports(fileType: string): boolean {
    return fileType === "application/pdf";
  }

  async extractText(fileData: ArrayBuffer, _fileName: string): Promise<string> {
    const parser = new PDFParse({ data: Buffer.from(fileData) });
    const textResult = await parser.getText();

    return textResult.text;
  }
}
