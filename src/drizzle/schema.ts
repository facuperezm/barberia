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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Barbers table
export const barbers = pgTable("barbers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  defaultWorkingHours: jsonb("default_working_hours").$type<{
    [key: string]: {
      // 0-6 for Sunday-Saturday
      isWorking: boolean;
      slots: { start: string; end: string }[];
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedule overrides table
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

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(), // duration in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
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
  status: text("status").default("pending"), // pending, confirmed, cancelled, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const barbersRelations = relations(barbers, ({ many }) => ({
  scheduleOverrides: many(scheduleOverrides),
  appointments: many(appointments),
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
