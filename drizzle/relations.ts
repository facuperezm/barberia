import { relations } from "drizzle-orm/relations";
import { barbers, appointments, services, schedules } from "./schema";

export const appointmentsRelations = relations(appointments, ({one}) => ({
	barber: one(barbers, {
		fields: [appointments.barberId],
		references: [barbers.id]
	}),
	service: one(services, {
		fields: [appointments.serviceId],
		references: [services.id]
	}),
}));

export const barbersRelations = relations(barbers, ({many}) => ({
	appointments: many(appointments),
	schedules: many(schedules),
}));

export const servicesRelations = relations(services, ({many}) => ({
	appointments: many(appointments),
}));

export const schedulesRelations = relations(schedules, ({one}) => ({
	barber: one(barbers, {
		fields: [schedules.barberId],
		references: [barbers.id]
	}),
}));