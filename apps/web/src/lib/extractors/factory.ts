import { ImageExtractionStrategy } from "./image-extractor";
import { PDFExtractionStrategy } from "./pdf-extractor";
import type { ExtractionStrategy } from "./types";

export class ExtractionStrategyFactory {
  private strategies: ExtractionStrategy[];

  constructor() {
    this.strategies = [
      new PDFExtractionStrategy(),
      new ImageExtractionStrategy(),
    ];
  }

  getStrategy(fileType: string): ExtractionStrategy {
    const strategy = this.strategies.find((candidate) =>
      candidate.supports(fileType),
    );

    if (!strategy) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return strategy;
  }

  getSupportedTypes(): string[] {
    return this.strategies.flatMap((strategy) => {
      if (strategy instanceof PDFExtractionStrategy) {
        return ["application/pdf"];
      }
      if (strategy instanceof ImageExtractionStrategy) {
        return ["image/jpeg", "image/png", "image/jpg"];
      }
      return [];
    });
  }
}
