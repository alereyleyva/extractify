import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { extractionRun } from "./extractions";

export const integrationTargetType = pgEnum("integration_target_type", [
  "webhook",
  "sheets",
  "postgres",
]);

export const integrationDeliveryStatus = pgEnum("integration_delivery_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
]);

export const integrationTarget = pgTable(
  "integration_target",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: integrationTargetType("type").notNull(),
    name: text("name").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("integration_target_owner_idx").on(table.ownerId),
    index("integration_target_owner_type_idx").on(table.ownerId, table.type),
    index("integration_target_owner_enabled_idx").on(
      table.ownerId,
      table.enabled,
    ),
  ],
);

export const integrationDelivery = pgTable(
  "integration_delivery",
  {
    id: uuid("id").primaryKey(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => integrationTarget.id, { onDelete: "cascade" }),
    extractionId: uuid("extraction_id")
      .notNull()
      .references(() => extractionRun.id, { onDelete: "cascade" }),
    status: integrationDeliveryStatus("status").default("pending").notNull(),
    responseStatus: integer("response_status"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("integration_delivery_status_idx").on(table.status, table.createdAt),
    index("integration_delivery_target_idx").on(table.targetId),
    index("integration_delivery_extraction_idx").on(table.extractionId),
  ],
);

export const integrationTargetRelations = relations(
  integrationTarget,
  ({ many, one }) => ({
    owner: one(user, {
      fields: [integrationTarget.ownerId],
      references: [user.id],
    }),
    deliveries: many(integrationDelivery),
  }),
);

export const integrationDeliveryRelations = relations(
  integrationDelivery,
  ({ one }) => ({
    target: one(integrationTarget, {
      fields: [integrationDelivery.targetId],
      references: [integrationTarget.id],
    }),
    extraction: one(extractionRun, {
      fields: [integrationDelivery.extractionId],
      references: [extractionRun.id],
    }),
  }),
);
