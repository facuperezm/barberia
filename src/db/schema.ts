import { pgTable, serial, varchar, date, time, timestamp, integer, decimal } from 'drizzle-orm/pg-core'

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  serviceId: integer('service_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const schedule = pgTable('schedule', {
  id: serial('id').primaryKey(),
  day: varchar('day', { length: 10 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
})

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  duration: integer('duration').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
})