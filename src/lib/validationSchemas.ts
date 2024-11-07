import { z } from "zod";

/**
 * Schema for creating a new reservation.
 */
export const reservationSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "First name is required" })
    .max(100, { message: "First name is too long" }),
  lastName: z
    .string()
    .min(1, { message: "Last name is required" })
    .max(100, { message: "Last name is too long" }),
  phoneNumber: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: "Invalid time format" }),
  serviceId: z
    .number()
    .int({ message: "Service ID must be an integer" })
    .positive({ message: "Service ID must be a positive number" }),
});

/**
 * Schema for admin login.
 */
export const adminLoginSchema = z.object({
  username: z
    .string()
    .min(1, { message: "Username is required" })
    .max(150, { message: "Username is too long" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password is too long" }),
});

/**
 * Schema for updating schedules.
 */
export const updateScheduleSchema = z.array(
  z.object({
    day: z
      .string()
      .min(1, { message: "Day is required" })
      .max(20, { message: "Day is too long" }),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
        message: "Invalid start time format",
      }),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
        message: "Invalid end time format",
      }),
  }),
);

/**
 * Schema for updating services.
 */
export const updateServicesSchema = z.array(
  z.object({
    id: z
      .number()
      .int({ message: "Service ID must be an integer" })
      .positive({ message: "Service ID must be a positive number" })
      .optional(),
    name: z
      .string()
      .min(1, { message: "Service name is required" })
      .max(255, { message: "Service name is too long" }),
    duration: z
      .number()
      .int({ message: "Duration must be an integer" })
      .positive({ message: "Duration must be a positive number" }),
    price: z
      .number()
      .nonnegative({ message: "Price cannot be negative" })
      .max(999999.99, { message: "Price is too high" }),
  }),
);

/**
 * Schema for creating an appointment.
 */
export const appointmentSchema = z.object({
  barberId: z
    .number()
    .int({ message: "Barber ID must be an integer" })
    .positive({ message: "Barber ID must be a positive number" }),
  serviceId: z
    .number()
    .int({ message: "Service ID must be an integer" })
    .positive({ message: "Service ID must be a positive number" }),
  customerName: z
    .string()
    .min(1, { message: "Customer name is required" })
    .max(255, { message: "Customer name is too long" }),
  customerEmail: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  customerPhone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: "Invalid time format" }),
});

/**
 * Schema for updating appointment status.
 */
export const updateAppointmentStatusSchema = z.object({
  id: z
    .number()
    .int({ message: "Appointment ID must be an integer" })
    .positive({ message: "Appointment ID must be a positive number" }),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"], {
    errorMap: () => ({ message: "Invalid status value" }),
  }),
});

/**
 * Schema for creating an employee.
 */
export const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Employee name is required" })
    .max(255, { message: "Employee name is too long" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  phone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" }),
});

/**
 * Schema for updating an employee.
 */
export const updateEmployeeSchema = z.object({
  id: z
    .number()
    .int({ message: "Employee ID must be an integer" })
    .positive({ message: "Employee ID must be a positive number" }),
  name: z
    .string()
    .min(1, { message: "Employee name is required" })
    .max(255, { message: "Employee name is too long" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  phone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" }),
});

/**
 * Schema for creating a barber.
 */
export const createBarberSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Barber name is required" })
    .max(255, { message: "Barber name is too long" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  phone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" })
    .optional(),
  imageUrl: z
    .string()
    .url({ message: "Invalid URL format" })
    .max(500, { message: "Image URL is too long" })
    .optional(),
});

/**
 * Schema for updating a barber.
 */
export const updateBarberSchema = z.object({
  id: z
    .number()
    .int({ message: "Barber ID must be an integer" })
    .positive({ message: "Barber ID must be a positive number" }),
  name: z
    .string()
    .min(1, { message: "Barber name is required" })
    .max(255, { message: "Barber name is too long" }),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email is too long" }),
  phone: z
    .string()
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d+\-().\s]+$/, { message: "Invalid phone number format" })
    .optional(),
  imageUrl: z
    .string()
    .url({ message: "Invalid URL format" })
    .max(500, { message: "Image URL is too long" })
    .optional(),
});

/**
 * Schema for creating an employee schedule.
 */
export const employeeScheduleSchema = z.object({
  employeeId: z
    .number()
    .int({ message: "Employee ID must be an integer" })
    .positive({ message: "Employee ID must be a positive number" }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  timeSlots: z
    .array(
      z
        .string()
        .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
          message: "Invalid time slot format",
        }),
    )
    .min(1, { message: "At least one time slot is required" }),
});
