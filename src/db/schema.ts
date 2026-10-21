import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "pm",
  "qa",
  "be",
  "fe",
  "ai",
  "devops",
  "inactive",
]);

export const ticketTypeEnum = pgEnum("ticket_type", [
  "bug",
  "request",
  "task",
  "question",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
]);

export const targetRoleEnum = pgEnum("target_role", [
  "pm",
  "qa",
  "be",
  "fe",
  "ai",
  "devops",
  "all",
]);

export const ticketSourceEnum = pgEnum("ticket_source", ["web", "discord"]);

export const ticketEventTypeEnum = pgEnum("ticket_event_type", [
  "created",
  "taken",
  "assigned",
  "resolved",
  "validated",
  "reopened",
  "cancelled",
  "released",
]);

// --- TABLES ---

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    discordId: varchar("discord_id", { length: 64 }).notNull().unique(),
    username: varchar("username", { length: 100 }),
    avatar: text("avatar"),
    email: varchar("email", { length: 255 }),
    role: userRoleEnum("role").default("inactive").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_users_discord_id").on(table.discordId)],
);

export const userRoleEvents = pgTable(
  "user_role_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    fromRole: userRoleEnum("from_role").notNull(),
    toRole: userRoleEnum("to_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_user_role_events_user_id").on(table.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    discordChannelId: varchar("discord_channel_id", { length: 64 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_projects_code").on(table.code)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "restrict" })
      .notNull(),
    seqNo: integer("seq_no").notNull(),
    number: varchar("number", { length: 32 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    type: ticketTypeEnum("type").notNull(),
    priority: ticketPriorityEnum("priority").notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    targetRole: targetRoleEnum("target_role").notNull(),
    reporterId: uuid("reporter_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    validatorId: uuid("validator_id").references(() => users.id, { onDelete: "set null" }),
    reopenCount: integer("reopen_count").default(0).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    source: ticketSourceEnum("source").default("web").notNull(),
    discordChannelId: varchar("discord_channel_id", { length: 64 }),
    discordMessageId: varchar("discord_message_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_tickets_number").on(table.number),
    uniqueIndex("idx_tickets_project_seq").on(table.projectId, table.seqNo),
    index("idx_tickets_project_status").on(table.projectId, table.status),
    index("idx_tickets_assignee_status").on(table.assigneeId, table.status),
    index("idx_tickets_status_target_role").on(table.status, table.targetRole),
    index("idx_tickets_created_at").on(table.createdAt),
  ],
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    authorId: uuid("author_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    body: text("body").notNull(),
    source: ticketSourceEnum("source").default("web").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_ticket_created").on(table.ticketId, table.createdAt),
  ],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .references(() => tickets.id, { onDelete: "cascade" })
      .notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    eventType: ticketEventTypeEnum("event_type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_events_ticket_created").on(table.ticketId, table.createdAt),
  ],
);

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const discordInteractionLog = pgTable(
  "discord_interaction_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interactionId: varchar("interaction_id", { length: 64 }).notNull().unique(),
    command: varchar("command", { length: 64 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    discordUserId: varchar("discord_user_id", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_interactions_id").on(table.interactionId),
    index("idx_interactions_created").on(table.createdAt),
  ],
);

// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  reportedTickets: many(tickets, { relationName: "reportedTickets" }),
  assignedTickets: many(tickets, { relationName: "assignedTickets" }),
  validatedTickets: many(tickets, { relationName: "validatedTickets" }),
  comments: many(ticketComments),
  roleEvents: many(userRoleEvents, { relationName: "userRoleEvents" }),
  ownedProjects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  reporter: one(users, {
    fields: [tickets.reporterId],
    references: [users.id],
    relationName: "reportedTickets",
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: "assignedTickets",
  }),
  validator: one(users, {
    fields: [tickets.validatorId],
    references: [users.id],
    relationName: "validatedTickets",
  }),
  comments: many(ticketComments),
  events: many(ticketEvents),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id],
  }),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
  actor: one(users, {
    fields: [ticketEvents.actorId],
    references: [users.id],
  }),
}));
