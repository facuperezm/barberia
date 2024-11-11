import { pgTable, unique, serial, text, timestamp, foreignKey, integer, date, time, numeric, boolean } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const barbers = pgTable("barbers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		barbersEmailUnique: unique("barbers_email_unique").on(table.email),
	}
});

export const appointments = pgTable("appointments", {
	id: serial().primaryKey().notNull(),
	barberId: integer("barber_id").notNull(),
	serviceId: integer("service_id").notNull(),
	customerName: text("customer_name").notNull(),
	customerEmail: text("customer_email").notNull(),
	customerPhone: text("customer_phone").notNull(),
	date: date().notNull(),
	time: time().notNull(),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		appointmentsBarberIdBarbersIdFk: foreignKey({
			columns: [table.barberId],
			foreignColumns: [barbers.id],
			name: "appointments_barber_id_barbers_id_fk"
		}),
		appointmentsServiceIdServicesIdFk: foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "appointments_service_id_services_id_fk"
		}),
	}
});

export const services = pgTable("services", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	duration: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const schedules = pgTable("schedules", {
	id: serial().primaryKey().notNull(),
	barberId: integer("barber_id").notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	isAvailable: boolean("is_available").default(true),
},
(table) => {
	return {
		schedulesBarberIdBarbersIdFk: foreignKey({
			columns: [table.barberId],
			foreignColumns: [barbers.id],
			name: "schedules_barber_id_barbers_id_fk"
		}),
	}
});
