import {
  type Block,
  DetectDocumentTextCommand,
  TextractClient,
} from "@aws-sdk/client-textract";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { env } from "@extractify/env/server";
import type { ExtractionStrategy } from "./types";

export class ImageExtractionStrategy implements ExtractionStrategy {
  private textractClient: TextractClient;

  constructor() {
    this.textractClient = new TextractClient({
      region: env.AWS_REGION,
      credentials: fromNodeProviderChain(),
    });
  }

  supports(fileType: string): boolean {
    return (
      fileType === "image/jpeg" ||
      fileType === "image/png" ||
      fileType === "image/jpg"
    );
  }

  async extractText(fileData: ArrayBuffer, _fileName: string): Promise<string> {
    const buffer = Buffer.from(fileData);

    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    const response = await this.textractClient.send(command);

    if (!response.Blocks) {
      return "";
    }

    const textBlocks = response.Blocks.filter(
      (block: Block) => block.BlockType === "LINE" && block.Text,
    );

    return textBlocks
      .map((block: Block) => block.Text)
      .filter((text: string | undefined): text is string => text !== undefined)
      .join("\n");
  }
}
