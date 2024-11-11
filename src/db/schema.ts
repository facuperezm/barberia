import {
  timestamp,
  pgTable,
  text,
  integer,
  serial,
  boolean,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define the barbers table with necessary constraints and indexes
export const barbers = pgTable("barbers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the services table with precise data types and constraints
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the schedules table with foreign key constraints and default values
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id")
    .references(() => barbers.id)
    .notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
});

// Define the appointments table with comprehensive status management
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
  status: text("status").default("pending"), // Possible values: pending, confirmed, cancelled, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for the barbers table
export const barbersRelations = relations(barbers, ({ many }) => ({
  schedules: many(schedules),
  appointments: many(appointments),
}));

// Define relations for the services table
export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
}));

// Define relations for the schedules table
export const schedulesRelations = relations(schedules, ({ one }) => ({
  barber: one(barbers, {
    fields: [schedules.barberId],
    references: [barbers.id],
  }),
}));

// Define relations for the appointments table
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

// Optional: Add indexes to optimize query performance
export const indexes = {
  barbersEmailIndex: {
    columns: [barbers.email],
    unique: true,
  },
  appointmentsStatusIndex: {
    columns: [appointments.status],
  },
};
