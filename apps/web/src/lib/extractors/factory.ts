import { AudioExtractionStrategy } from "./audio-extractor";
import { ImageExtractionStrategy } from "./image-extractor";
import { PDFExtractionStrategy } from "./pdf-extractor";
import {
  type ExtractionStrategy,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_PDF_TYPES,
} from "./types";

export class ExtractionStrategyFactory {
  private strategies: ExtractionStrategy[];

  constructor() {
    this.strategies = [
      new PDFExtractionStrategy(),
      new ImageExtractionStrategy(),
      new AudioExtractionStrategy(),
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
        return [...SUPPORTED_PDF_TYPES];
      }
      if (strategy instanceof ImageExtractionStrategy) {
        return [...SUPPORTED_IMAGE_TYPES];
      }
      if (strategy instanceof AudioExtractionStrategy) {
        return [...SUPPORTED_AUDIO_TYPES];
      }
      return [];
    });
  }
}
