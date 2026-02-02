import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { getActiveModelVersionForOwner } from "@extractify/db/models";
import { env } from "@extractify/env/server";
import {
  AttributeListSchema,
  type AttributeSchema,
} from "@extractify/shared/attribute-model";
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { ExtractionStrategyFactory } from "@/lib/extractors/factory";
import { requireUserId } from "@/lib/server/require-user-id";

const ExtractDataSchema = z.object({
  fileData: z.instanceof(ArrayBuffer),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  attributes: AttributeListSchema,
});

const ExtractDataFromModelSchema = z.object({
  modelId: z.string().min(1),
  fileData: z.instanceof(ArrayBuffer),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

function createNestedFieldSchema(
  attr: z.infer<typeof AttributeSchema>,
): z.ZodTypeAny {
  if (attr.type === "array") {
    return z.array(z.string()).nullable();
  }

  if (attr.type === "record") {
    if (!attr.children || attr.children.length === 0) {
      return z.record(z.string(), z.string()).nullable();
    }

    const recordSchema: Record<string, z.ZodTypeAny> = {};
    for (const child of attr.children) {
      recordSchema[child.name] = createNestedFieldSchema(child);
    }
    return z.object(recordSchema).nullable();
  }

  if (attr.type === "arrayOfRecords") {
    if (!attr.children || attr.children.length === 0) {
      return z.array(z.record(z.string(), z.string())).nullable();
    }

    const recordSchema: Record<string, z.ZodTypeAny> = {};
    for (const child of attr.children) {
      recordSchema[child.name] = createNestedFieldSchema(child);
    }
    return z.array(z.object(recordSchema)).nullable();
  }

  return z.string().nullable();
}

function createFieldSchema(
  attr: z.infer<typeof AttributeSchema>,
): z.ZodTypeAny {
  const description = attr.description || attr.name;
  const valueSchema = createNestedFieldSchema(attr);

  return z
    .object({
      value: valueSchema.describe(
        `The extracted value for ${description}. Format: ${
          attr.type === "array"
            ? "array of strings"
            : attr.type === "record"
              ? "object with nested fields"
              : attr.type === "arrayOfRecords"
                ? "array of objects with nested fields"
                : "string"
        }`,
      ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe(
          `Confidence score (0-1) indicating how certain the extraction is for ${description}`,
        ),
    })
    .describe(description);
}

function createAttributeSchema(attributes: z.infer<typeof AttributeSchema>[]) {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  for (const attr of attributes) {
    schemaObject[attr.name] = createFieldSchema(attr);
  }

  return z.object(schemaObject);
}

function buildAttributeDescription(
  attr: z.infer<typeof AttributeSchema>,
  indent = 0,
): string {
  const prefix = "  ".repeat(indent);
  const nameDesc = attr.description
    ? `${attr.name}: ${attr.description}`
    : attr.name;

  let result = `${prefix}- ${nameDesc} (type: ${attr.type})`;

  if (attr.type === "array") {
    result += " - Extract as an array of string values";
  } else if (attr.type === "record") {
    result += " - Extract as an object with the following nested fields:";
    if (attr.children && attr.children.length > 0) {
      result += "\n";
      for (const child of attr.children) {
        result += `\n${buildAttributeDescription(child, indent + 1)}`;
      }
    }
  } else if (attr.type === "arrayOfRecords") {
    result +=
      " - Extract as an array of objects, where each object has the following fields:";
    if (attr.children && attr.children.length > 0) {
      result += "\n";
      for (const child of attr.children) {
        result += `\n${buildAttributeDescription(child, indent + 1)}`;
      }
    }
  }

  return result;
}

function buildExtractionPrompt(
  documentText: string,
  attributes: z.infer<typeof AttributeSchema>[],
): string {
  const attributesList = attributes
    .map((attr) => buildAttributeDescription(attr))
    .join("\n");

  return `Extract the following information from the provided document text.
Be precise and only extract information that is explicitly stated in the document.
If a field is not found, use null for that field.

For each attribute, provide:
- value: The extracted value (or null if not found). The format depends on the attribute type:
  * string: A single string value
  * array: An array of string values (e.g., ["item1", "item2"])
  * record: An object with nested fields as defined
  * arrayOfRecords: An array of objects, each with the defined nested fields
- confidence: A confidence score between 0 and 1 indicating how certain you are about the extraction:
  * 1.0 = Very high confidence (information is clearly and explicitly stated)
  * 0.8-0.9 = High confidence (information is likely present but may require some inference)
  * 0.6-0.7 = Medium confidence (information is somewhat ambiguous or partially present)
  * 0.4-0.5 = Low confidence (uncertain if information is present or correct)
  * 0.0-0.3 = Very low confidence (information is likely not present or very unclear)
  * If value is null, confidence should be 0.0

Document text:
${documentText}

Extract the following attributes:
${attributesList}`;
}

function getBedrockModel() {
  const bedrock = createAmazonBedrock({
    region: env.AWS_REGION,
    credentialProvider: fromNodeProviderChain(),
  });

  return bedrock("qwen.qwen3-32b-v1:0");
}

async function runExtraction(input: {
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  attributes: z.infer<typeof AttributeSchema>[];
}) {
  const factory = new ExtractionStrategyFactory();
  const strategy = factory.getStrategy(input.fileType);
  const documentText = await strategy.extractText(
    input.fileData,
    input.fileName,
  );

  const schema = createAttributeSchema(input.attributes);
  const bedrockModel = getBedrockModel();
  const prompt = buildExtractionPrompt(documentText, input.attributes);

  const { output, totalUsage } = await generateText({
    model: bedrockModel,
    output: Output.object({
      schema,
    }),
    prompt,
  });

  return {
    data: output as Record<string, object>,
    usage: totalUsage,
  };
}

export const extractData = createServerFn({ method: "POST" })
  .inputValidator(ExtractDataSchema)
  .handler(async ({ data }) => {
    await requireUserId();
    return runExtraction(data);
  });

export const extractDataFromModel = createServerFn({ method: "POST" })
  .inputValidator(ExtractDataFromModelSchema)
  .handler(async ({ data }) => {
    const ownerId = await requireUserId();
    const activeVersion = await getActiveModelVersionForOwner(
      ownerId,
      data.modelId,
    );

    if (!activeVersion) {
      throw new Error("Model not found");
    }

    return runExtraction({
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      attributes: activeVersion.attributes,
    });
  });
