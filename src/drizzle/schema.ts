import {
  timestamp,
  pgTable,
  text,
  integer,
  serial,
  boolean,
  date,
  time,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

//
// ──────────────────────────────────────────────────────────────────────────────
//   ENUMS (Define first for reuse)
// ──────────────────────────────────────────────────────────────────────────────
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "stripe",
  "paypal",
  "bank_transfer",
  "mercadopago",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

//
// ──────────────────────────────────────────────────────────────────────────────
//   SALONS (Multi-tenant support)
// ──────────────────────────────────────────────────────────────────────────────
export const salons = pgTable(
  "salons",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // For URL-friendly identification
    ownerName: text("owner_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    address: text("address"),
    timezone: text("timezone").notNull().default("UTC"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("salons_slug_idx").on(table.slug),
    emailIdx: uniqueIndex("salons_email_idx").on(table.email),
    activeIdx: index("salons_active_idx").on(table.isActive),
  }),
);

export type Salon = typeof salons.$inferSelect;
export type InsertSalon = typeof salons.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   BARBERS
// ──────────────────────────────────────────────────────────────────────────────
export const barbers = pgTable(
  "barbers",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .references(() => salons.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    imageUrl: text("image_url"),
    bio: text("bio"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    salonIdIdx: index("barbers_salon_id_idx").on(table.salonId),
    emailSalonIdx: uniqueIndex("barbers_email_salon_idx").on(
      table.email,
      table.salonId,
    ),
    activeIdx: index("barbers_active_idx").on(table.isActive),
  }),
);

export type Barber = typeof barbers.$inferSelect;
export type InsertBarber = typeof barbers.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   SERVICES
// ──────────────────────────────────────────────────────────────────────────────
export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .references(() => salons.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    salonIdIdx: index("services_salon_id_idx").on(table.salonId),
    activeIdx: index("services_active_idx").on(table.isActive),
    priceCheck: check("services_price_positive", sql`${table.priceCents} > 0`),
    durationCheck: check(
      "services_duration_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  }),
);

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   CUSTOMERS
// ──────────────────────────────────────────────────────────────────────────────
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .references(() => salons.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    notes: text("notes"), // For barber notes about customer preferences
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    salonIdIdx: index("customers_salon_id_idx").on(table.salonId),
    emailSalonIdx: uniqueIndex("customers_email_salon_idx").on(
      table.email,
      table.salonId,
    ),
    phoneIdx: index("customers_phone_idx").on(table.phone),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   WORKING HOURS (Recurring Weekly Schedule)
// ──────────────────────────────────────────────────────────────────────────────
export const workingHours = pgTable(
  "working_hours",
  {
    id: serial("id").primaryKey(),
    barberId: integer("barber_id")
      .references(() => barbers.id, { onDelete: "cascade" })
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, … 6 = Saturday
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isWorking: boolean("is_working").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    barberDayIdx: uniqueIndex("working_hours_barber_day_idx").on(
      table.barberId,
      table.dayOfWeek,
    ),
    dayOfWeekCheck: check(
      "working_hours_day_valid",
      sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`,
    ),
    // Only validate time constraint when actually working
    timeCheck: check(
      "working_hours_time_valid",
      sql`${table.isWorking} = false OR ${table.startTime} < ${table.endTime}`,
    ),
  }),
);

export type WorkingHour = typeof workingHours.$inferSelect;
export type InsertWorkingHour = typeof workingHours.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   SCHEDULE OVERRIDES (One-Off Date Exceptions)
// ──────────────────────────────────────────────────────────────────────────────
export const scheduleOverrides = pgTable(
  "schedule_overrides",
  {
    id: serial("id").primaryKey(),
    barberId: integer("barber_id")
      .references(() => barbers.id, { onDelete: "cascade" })
      .notNull(),
    date: date("date").notNull(),
    isWorkingDay: boolean("is_working_day").notNull(),
    availableSlots:
      jsonb("available_slots").$type<{ start: string; end: string }[]>(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    barberDateIdx: uniqueIndex("schedule_overrides_barber_date_idx").on(
      table.barberId,
      table.date,
    ),
    dateIdx: index("schedule_overrides_date_idx").on(table.date),
  }),
);

export type ScheduleOverride = typeof scheduleOverrides.$inferSelect;
export type InsertScheduleOverride = typeof scheduleOverrides.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   APPOINTMENTS
// ──────────────────────────────────────────────────────────────────────────────
export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    salonId: integer("salon_id")
      .references(() => salons.id, { onDelete: "cascade" })
      .notNull(),
    barberId: integer("barber_id")
      .references(() => barbers.id, { onDelete: "restrict" })
      .notNull(),
    serviceId: integer("service_id")
      .references(() => services.id, { onDelete: "restrict" })
      .notNull(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    appointmentAt: timestamp("appointment_at", {
      withTimezone: true,
    }),
    endTime: timestamp("end_time", { withTimezone: true }), // Computed from appointmentAt + service duration
    status: appointmentStatusEnum("status").notNull().default("pending"),
    notes: text("notes"), // Special requests or notes
    
    // Current fields (will be migrated to proper schema later)
    date: date("date"), // Currently used - will migrate to appointmentAt
    time: time("time"), // Currently used - will migrate to appointmentAt
    customerName: text("customer_name"), // Currently used - will migrate to customerId relation
    customerEmail: text("customer_email"), // Currently used - will migrate to customerId relation
    customerPhone: text("customer_phone"), // Currently used - will migrate to customerId relation
    
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    salonIdIdx: index("appointments_salon_id_idx").on(table.salonId),
    barberIdIdx: index("appointments_barber_id_idx").on(table.barberId),
    customerIdIdx: index("appointments_customer_id_idx").on(table.customerId),
    appointmentAtIdx: index("appointments_appointment_at_idx").on(
      table.appointmentAt,
    ),
    statusIdx: index("appointments_status_idx").on(table.status),
    barberDateIdx: index("appointments_barber_date_idx").on(
      table.barberId,
      table.appointmentAt,
    ),
    // Legacy indexes for backward compatibility
    dateIdx: index("appointments_date_idx").on(table.date),
    barberDateLegacyIdx: index("appointments_barber_date_legacy_idx").on(
      table.barberId,
      table.date,
    ),
    // Prevent overlapping appointments for the same barber
    noOverlapCheck: check(
      "appointments_no_overlap",
      sql`${table.appointmentAt} < ${table.endTime}`,
    ),
  }),
);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   RATINGS (Customer Feedback)
// ──────────────────────────────────────────────────────────────────────────────
export const ratings = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    appointmentId: integer("appointment_id")
      .references(() => appointments.id, { onDelete: "cascade" })
      .notNull()
      .unique(), // One rating per appointment
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    appointmentIdIdx: uniqueIndex("ratings_appointment_id_idx").on(
      table.appointmentId,
    ),
    ratingIdx: index("ratings_rating_idx").on(table.rating),
    ratingCheck: check(
      "ratings_rating_valid",
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`,
    ),
  }),
);

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   PAYMENTS
// ──────────────────────────────────────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    appointmentId: integer("appointment_id")
      .references(() => appointments.id, { onDelete: "cascade" })
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    // MercadoPago specific fields
    mercadopagoPaymentId: text("mercadopago_payment_id"),
    mercadopagoPreferenceId: text("mercadopago_preference_id"),
    mercadopagoPaymentMethodId: text("mercadopago_payment_method_id"),
    mercadopagoPaymentType: text("mercadopago_payment_type"),
    mercadopagoInstallments: integer("mercadopago_installments"),
    mercadopagoCardLastFourDigits: text("mercadopago_card_last_four_digits"),
    mercadopagoPayerEmail: text("mercadopago_payer_email"),
    mercadopagoProcessingMode: text("mercadopago_processing_mode"), // gateway or aggregator
    mercadopagoOperationType: text("mercadopago_operation_type"), // regular_payment, subscription_payment, etc.
    mercadopagoExternalReference: text("mercadopago_external_reference"),
    mercadopagoTransactionDetails: jsonb("mercadopago_transaction_details"),
    mercadopagoStatusDetail: text("mercadopago_status_detail"),
    mercadopagoFailureReason: text("mercadopago_failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    appointmentIdIdx: index("payments_appointment_id_idx").on(
      table.appointmentId,
    ),
    statusIdx: index("payments_status_idx").on(table.status),
    methodIdx: index("payments_method_idx").on(table.method),
    stripeIdIdx: index("payments_stripe_id_idx").on(
      table.stripePaymentIntentId,
    ),
    // MercadoPago indexes
    mercadopagoPaymentIdIdx: index("payments_mercadopago_payment_id_idx").on(
      table.mercadopagoPaymentId,
    ),
    mercadopagoPreferenceIdIdx: index("payments_mercadopago_preference_id_idx").on(
      table.mercadopagoPreferenceId,
    ),
    mercadopagoExternalRefIdx: index("payments_mercadopago_external_ref_idx").on(
      table.mercadopagoExternalReference,
    ),
    amountCheck: check(
      "payments_amount_positive",
      sql`${table.amountCents} > 0`,
    ),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

//
// ──────────────────────────────────────────────────────────────────────────────
//   RELATIONS
// ──────────────────────────────────────────────────────────────────────────────
export const salonsRelations = relations(salons, ({ many }) => ({
  barbers: many(barbers),
  services: many(services),
  customers: many(customers),
  appointments: many(appointments),
}));

export const barbersRelations = relations(barbers, ({ many, one }) => ({
  salon: one(salons, {
    fields: [barbers.salonId],
    references: [salons.id],
  }),
  workingHours: many(workingHours),
  scheduleOverrides: many(scheduleOverrides),
  appointments: many(appointments),
}));

// Helper function to get current salon ID from context
export const getCurrentSalonId = (): number => {
  // This will be implemented based on your authentication system
  // For now, return a default salon ID (you'll need to implement this)
  return 1; // TODO: Get from auth context
};

export const servicesRelations = relations(services, ({ many, one }) => ({
  salon: one(salons, {
    fields: [services.salonId],
    references: [salons.id],
  }),
  appointments: many(appointments),
}));

export const customersRelations = relations(customers, ({ many, one }) => ({
  salon: one(salons, {
    fields: [customers.salonId],
    references: [salons.id],
  }),
  appointments: many(appointments),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  barber: one(barbers, {
    fields: [workingHours.barberId],
    references: [barbers.id],
  }),
}));

export const scheduleOverridesRelations = relations(
  scheduleOverrides,
  ({ one }) => ({
    barber: one(barbers, {
      fields: [scheduleOverrides.barberId],
      references: [barbers.id],
    }),
  }),
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  salon: one(salons, {
    fields: [appointments.salonId],
    references: [salons.id],
  }),
  barber: one(barbers, {
    fields: [appointments.barberId],
    references: [barbers.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
  }),
  rating: one(ratings),
  payments: one(payments),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  appointment: one(appointments, {
    fields: [ratings.appointmentId],
    references: [appointments.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}));
