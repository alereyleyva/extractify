import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { integrationDelivery } from "./integrations";
import { attributeModel, attributeModelVersion } from "./models";

export const extractionStatus = pgEnum("extraction_status", [
  "processing",
  "completed",
  "failed",
]);

export const extractionRun = pgTable(
  "extraction_run",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => attributeModel.id, { onDelete: "cascade" }),
    modelVersionId: uuid("model_version_id")
      .notNull()
      .references(() => attributeModelVersion.id, { onDelete: "cascade" }),
    llmModelId: text("llm_model_id").notNull(),
    status: extractionStatus("status").default("processing").notNull(),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    usage: jsonb("usage").$type<{
      inputTokens: number;
      outputTokens: number;
    } | null>(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("extraction_run_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
    ),
    index("extraction_run_owner_status_idx").on(table.ownerId, table.status),
    index("extraction_run_model_idx").on(table.modelId),
  ],
);

export const extractionInput = pgTable(
  "extraction_input",
  {
    id: uuid("id").primaryKey(),
    extractionId: uuid("extraction_id")
      .notNull()
      .references(() => extractionRun.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size"),
    sourceOrder: integer("source_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("extraction_input_extraction_idx").on(table.extractionId)],
);

export const extractionError = pgTable(
  "extraction_error",
  {
    id: uuid("id").primaryKey(),
    extractionId: uuid("extraction_id")
      .notNull()
      .references(() => extractionRun.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("extraction_error_extraction_idx").on(table.extractionId),
    index("extraction_error_owner_idx").on(table.ownerId),
    uniqueIndex("extraction_error_extraction_unique").on(table.extractionId),
  ],
);

export const extractionRunRelations = relations(
  extractionRun,
  ({ many, one }) => ({
    owner: one(user, {
      fields: [extractionRun.ownerId],
      references: [user.id],
    }),
    model: one(attributeModel, {
      fields: [extractionRun.modelId],
      references: [attributeModel.id],
    }),
    modelVersion: one(attributeModelVersion, {
      fields: [extractionRun.modelVersionId],
      references: [attributeModelVersion.id],
    }),
    deliveries: many(integrationDelivery),
    inputs: many(extractionInput),
    errors: many(extractionError),
  }),
);

export const extractionInputRelations = relations(
  extractionInput,
  ({ one }) => ({
    extraction: one(extractionRun, {
      fields: [extractionInput.extractionId],
      references: [extractionRun.id],
    }),
  }),
);

export const extractionErrorRelations = relations(
  extractionError,
  ({ one }) => ({
    extraction: one(extractionRun, {
      fields: [extractionError.extractionId],
      references: [extractionRun.id],
    }),
    owner: one(user, {
      fields: [extractionError.ownerId],
      references: [user.id],
    }),
  }),
);
