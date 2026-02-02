import type { AttributeInput } from "@extractify/shared/attribute-model";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export type AttributeDefinition = AttributeInput;

export const attributeModel = pgTable(
  "attribute_model",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("attribute_model_ownerId_idx").on(table.ownerId)],
);

export const attributeModelVersion = pgTable(
  "attribute_model_version",
  {
    id: uuid("id").primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => attributeModel.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    changelog: text("changelog"),
    attributes: jsonb("attributes").$type<AttributeDefinition[]>().notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("attribute_model_version_modelId_idx").on(table.modelId),
    uniqueIndex("attribute_model_version_unique").on(
      table.modelId,
      table.versionNumber,
    ),
  ],
);

export const attributeModelRelations = relations(
  attributeModel,
  ({ many, one }) => ({
    owner: one(user, {
      fields: [attributeModel.ownerId],
      references: [user.id],
    }),
    versions: many(attributeModelVersion),
  }),
);

export const attributeModelVersionRelations = relations(
  attributeModelVersion,
  ({ one }) => ({
    model: one(attributeModel, {
      fields: [attributeModelVersion.modelId],
      references: [attributeModel.id],
    }),
  }),
);
