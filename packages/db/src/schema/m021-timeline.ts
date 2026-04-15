// ============================================
// M021 — Trip Timeline: Drizzle ORM Schema
// ============================================
// Modul: M021 (M02 almodul)
// Verzió: 1.0
// Dátum: 2026-04-16
// Leírás: Szervezési mérföldkövek — sablon + trip-specifikus táblák
// ============================================

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles } from './m01-user';
import { categories, trips } from './m02-trip';

// ============================================
// 1. ENUM
// ============================================

export const milestoneStatusEnum = pgEnum('milestone_status_t', [
  'not_started',
  'in_progress',
  'done',
]);

// ============================================
// 2. SABLON TÁBLÁK (ref_*)
// ============================================

export const refTimelineTemplates = pgTable(
  'ref_timeline_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    nameLocalized: jsonb('name_localized').default({}),
    description: text('description'),
    descriptionLocalized: jsonb('description_localized').default({}),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    icon: varchar('icon', { length: 50 }).default('clipboard-list'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

export const refPhaseTemplates = pgTable(
  'ref_phase_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    timelineTemplateId: uuid('timeline_template_id')
      .notNull()
      .references(() => refTimelineTemplates.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    nameLocalized: jsonb('name_localized').default({}),
    icon: varchar('icon', { length: 50 }).default('circle'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_phase_templates_timeline').on(table.timelineTemplateId),
  ]
);

export const refMilestoneTemplates = pgTable(
  'ref_milestone_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseTemplateId: uuid('phase_template_id')
      .notNull()
      .references(() => refPhaseTemplates.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    nameLocalized: jsonb('name_localized').default({}),
    description: text('description'),
    descriptionLocalized: jsonb('description_localized').default({}),
    defaultOffsetDays: integer('default_offset_days'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_milestone_templates_phase').on(table.phaseTemplateId),
  ]
);

export const refTaskTemplates = pgTable(
  'ref_task_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    milestoneTemplateId: uuid('milestone_template_id')
      .notNull()
      .references(() => refMilestoneTemplates.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 300 }).notNull(),
    nameLocalized: jsonb('name_localized').default({}),
    description: text('description'),
    descriptionLocalized: jsonb('description_localized').default({}),
    defaultOffsetDays: integer('default_offset_days'),
    defaultDurationDays: integer('default_duration_days').default(1),
    assigneeType: varchar('assignee_type', { length: 30 }).notNull().default('organizer'),
    defaultRole: varchar('default_role', { length: 100 }),
    isRequired: boolean('is_required').notNull().default(true),
    isBlocking: boolean('is_blocking').notNull().default(false),
    requiresVerification: boolean('requires_verification').notNull().default(false),
    taskType: varchar('task_type', { length: 30 }).notNull().default('checklist'),
    taskConfig: jsonb('task_config').default({}),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 7 }),
    helpText: text('help_text'),
    helpTextLocalized: jsonb('help_text_localized').default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_task_templates_milestone').on(table.milestoneTemplateId),
  ]
);

// ============================================
// 3. TRIP-SPECIFIKUS TÁBLÁK
// ============================================

export const tripPhases = pgTable(
  'trip_phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    templatePhaseId: uuid('template_phase_id')
      .references(() => refPhaseTemplates.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 50 }).default('circle'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trip_phases_trip').on(table.tripId),
  ]
);

export const tripMilestones = pgTable(
  'trip_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => tripPhases.id, { onDelete: 'cascade' }),
    templateMilestoneId: uuid('template_milestone_id')
      .references(() => refMilestoneTemplates.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    status: milestoneStatusEnum('status').notNull().default('not_started'),
    dueDate: date('due_date'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trip_milestones_trip').on(table.tripId),
    index('idx_trip_milestones_phase').on(table.phaseId),
  ]
);

export const tripMilestoneAssignees = pgTable(
  'trip_milestone_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => tripMilestones.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_milestone_assignee').on(table.milestoneId, table.userId),
    index('idx_milestone_assignees_milestone').on(table.milestoneId),
    index('idx_milestone_assignees_user').on(table.userId),
  ]
);

export const tripTasks = pgTable(
  'trip_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => tripMilestones.id, { onDelete: 'cascade' }),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    templateTaskId: uuid('template_task_id')
      .references(() => refTaskTemplates.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 300 }).notNull(),
    description: text('description'),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    durationDays: integer('duration_days'),
    assigneeType: varchar('assignee_type', { length: 30 }).notNull().default('organizer'),
    assigneeId: uuid('assignee_id').references(() => profiles.id, { onDelete: 'set null' }),
    isRequired: boolean('is_required').notNull().default(true),
    isBlocking: boolean('is_blocking').notNull().default(false),
    requiresVerification: boolean('requires_verification').notNull().default(false),
    taskType: varchar('task_type', { length: 30 }).notNull().default('checklist'),
    taskConfig: jsonb('task_config').default({}),
    taskResult: jsonb('task_result').default({}),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedBy: uuid('submitted_by').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => profiles.id, { onDelete: 'set null' }),
    rejectionNote: text('rejection_note'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => profiles.id, { onDelete: 'set null' }),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 7 }),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trip_tasks_milestone').on(table.milestoneId),
    index('idx_trip_tasks_trip').on(table.tripId),
    index('idx_trip_tasks_assignee').on(table.assigneeId),
    index('idx_trip_tasks_status').on(table.tripId, table.status),
  ]
);

export const tripTaskAssignees = pgTable(
  'trip_task_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tripTasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_task_assignee').on(table.taskId, table.userId),
    index('idx_task_assignees_task').on(table.taskId),
    index('idx_task_assignees_user').on(table.userId),
  ]
);

// ============================================
// 4. RELATIONS
// ============================================

// -- Sablon relations --

export const refTimelineTemplatesRelations = relations(refTimelineTemplates, ({ one, many }) => ({
  category: one(categories, {
    fields: [refTimelineTemplates.categoryId],
    references: [categories.id],
  }),
  phases: many(refPhaseTemplates),
}));

export const refPhaseTemplatesRelations = relations(refPhaseTemplates, ({ one, many }) => ({
  timelineTemplate: one(refTimelineTemplates, {
    fields: [refPhaseTemplates.timelineTemplateId],
    references: [refTimelineTemplates.id],
  }),
  milestones: many(refMilestoneTemplates),
}));

export const refMilestoneTemplatesRelations = relations(refMilestoneTemplates, ({ one, many }) => ({
  phaseTemplate: one(refPhaseTemplates, {
    fields: [refMilestoneTemplates.phaseTemplateId],
    references: [refPhaseTemplates.id],
  }),
  tasks: many(refTaskTemplates),
}));

export const refTaskTemplatesRelations = relations(refTaskTemplates, ({ one }) => ({
  milestoneTemplate: one(refMilestoneTemplates, {
    fields: [refTaskTemplates.milestoneTemplateId],
    references: [refMilestoneTemplates.id],
  }),
}));

// -- Trip-specifikus relations --

export const tripPhasesRelations = relations(tripPhases, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripPhases.tripId],
    references: [trips.id],
  }),
  templatePhase: one(refPhaseTemplates, {
    fields: [tripPhases.templatePhaseId],
    references: [refPhaseTemplates.id],
  }),
  milestones: many(tripMilestones),
}));

export const tripMilestonesRelations = relations(tripMilestones, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripMilestones.tripId],
    references: [trips.id],
  }),
  phase: one(tripPhases, {
    fields: [tripMilestones.phaseId],
    references: [tripPhases.id],
  }),
  templateMilestone: one(refMilestoneTemplates, {
    fields: [tripMilestones.templateMilestoneId],
    references: [refMilestoneTemplates.id],
  }),
  assignees: many(tripMilestoneAssignees),
  tasks: many(tripTasks),
}));

export const tripMilestoneAssigneesRelations = relations(tripMilestoneAssignees, ({ one }) => ({
  milestone: one(tripMilestones, {
    fields: [tripMilestoneAssignees.milestoneId],
    references: [tripMilestones.id],
  }),
  user: one(profiles, {
    fields: [tripMilestoneAssignees.userId],
    references: [profiles.id],
  }),
}));

export const tripTasksRelations = relations(tripTasks, ({ one, many }) => ({
  milestone: one(tripMilestones, {
    fields: [tripTasks.milestoneId],
    references: [tripMilestones.id],
  }),
  trip: one(trips, {
    fields: [tripTasks.tripId],
    references: [trips.id],
  }),
  templateTask: one(refTaskTemplates, {
    fields: [tripTasks.templateTaskId],
    references: [refTaskTemplates.id],
  }),
  assignee: one(profiles, {
    fields: [tripTasks.assigneeId],
    references: [profiles.id],
  }),
  taskAssignees: many(tripTaskAssignees),
}));

export const tripTaskAssigneesRelations = relations(tripTaskAssignees, ({ one }) => ({
  task: one(tripTasks, {
    fields: [tripTaskAssignees.taskId],
    references: [tripTasks.id],
  }),
  user: one(profiles, {
    fields: [tripTaskAssignees.userId],
    references: [profiles.id],
  }),
}));

// ============================================
// 5. TYPE EXPORTS
// ============================================

// Sablon típusok
export type RefTimelineTemplate = typeof refTimelineTemplates.$inferSelect;
export type NewRefTimelineTemplate = typeof refTimelineTemplates.$inferInsert;

export type RefPhaseTemplate = typeof refPhaseTemplates.$inferSelect;
export type NewRefPhaseTemplate = typeof refPhaseTemplates.$inferInsert;

export type RefMilestoneTemplate = typeof refMilestoneTemplates.$inferSelect;
export type NewRefMilestoneTemplate = typeof refMilestoneTemplates.$inferInsert;

export type RefTaskTemplate = typeof refTaskTemplates.$inferSelect;
export type NewRefTaskTemplate = typeof refTaskTemplates.$inferInsert;

// Trip-specifikus típusok
export type TripPhase = typeof tripPhases.$inferSelect;
export type NewTripPhase = typeof tripPhases.$inferInsert;

export type TripMilestone = typeof tripMilestones.$inferSelect;
export type NewTripMilestone = typeof tripMilestones.$inferInsert;

export type TripMilestoneAssignee = typeof tripMilestoneAssignees.$inferSelect;
export type NewTripMilestoneAssignee = typeof tripMilestoneAssignees.$inferInsert;

export type TripTask = typeof tripTasks.$inferSelect;
export type NewTripTask = typeof tripTasks.$inferInsert;

export type TripTaskAssignee = typeof tripTaskAssignees.$inferSelect;
export type NewTripTaskAssignee = typeof tripTaskAssignees.$inferInsert;

// Enum típusok
export type MilestoneStatus = (typeof milestoneStatusEnum.enumValues)[number];
