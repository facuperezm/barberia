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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const barbers = pgTable("barbers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduleOverrides = pgTable("schedule_overrides", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id")
    .references(() => barbers.id)
    .notNull(),
  date: date("date").notNull(),
  isWorkingDay: boolean("is_working_day").notNull(),
  availableSlots:
    jsonb("available_slots").$type<{ start: string; end: string }[]>(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(), // duration in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id")
    .references(() => barbers.id)
    .notNull(),
  serviceId: integer("service_id")
    .references(() => services.id)
    .notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  status: appointmentStatus("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workingHours = pgTable("working_hours", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id")
    .references(() => barbers.id)
    .notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isWorking: boolean("is_working").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const barbersRelations = relations(barbers, ({ many }) => ({
  scheduleOverrides: many(scheduleOverrides),
  appointments: many(appointments),
  workingHours: many(workingHours),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  barber: one(barbers, {
    fields: [workingHours.barberId],
    references: [barbers.id],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
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
  barber: one(barbers, {
    fields: [appointments.barberId],
    references: [barbers.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));
