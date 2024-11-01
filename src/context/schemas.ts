import z from "zod";

export const stepOneSchema = z.object({
  barber: z.string().min(1, "Please enter a barber name."),
});

export const stepTwoSchema = z.object({
  date: z.string().min(1, "Please enter a date."),
  time: z.string().min(1, "Please enter a time."),
});

export const stepThreeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Please enter a phone number."),
});

export const newReservationSchema = z.object({
  ...stepOneSchema.shape,
  ...stepTwoSchema.shape,
  ...stepThreeSchema.shape,
});

export const newReservationInitialValuesSchema = z.object({
  barber: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  service: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export type NewReservationType = z.infer<typeof newReservationSchema>;
export type NewReservationInitialValuesType = z.infer<
  typeof newReservationInitialValuesSchema
>;
