"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/use-services";
import { useBarbers } from "@/hooks/use-barbers";
import { useAvailableTimes } from "@/hooks/use-available-time";

const reservationSchema = z.object({
  service: z.string().min(1, "Selecciona un servicio"),
  barber: z.string().min(1, "Selecciona un barbero"),
  date: z.string().min(1, "Selecciona una fecha"),
  time: z.string().min(1, "Selecciona una hora"),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(7, "El teléfono debe tener al menos 7 dígitos"),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

const ReservationForm = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate: makeReservation, isLoading: reservationLoading } =
    useMakeReservation();

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    mode: "onChange",
  });

  const { watch, handleSubmit, control, trigger } = form;

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const {
    data: services,
    isLoading: servicesLoading,
    error: servicesError,
  } = useServices();

  const {
    data: barbers,
    isLoading: barbersLoading,
    error: barbersError,
  } = useBarbers();
  const {
    data: availableTimes,
    isLoading: timesLoading,
    error: timesError,
  } = useAvailableTimes(watch("date"), watch("barber"));
  const onSubmit = (data: ReservationFormData) => {
    setIsSubmitting(true);
    makeReservation(data, {
      onSuccess: () => {
        toast({
          title: "Reserva Exitosa",
          description: "Tu reserva ha sido confirmada.",
        });
        form.reset();
        setStep(1);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description:
            error.message || "Ocurrió un error al procesar la reserva.",
        });
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <FormField
            control={control}
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servicio</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                    disabled={servicesLoading || servicesError}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - ${service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 2:
        return (
          <FormField
            control={control}
            name="barber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barbero</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                    disabled={barbersLoading || barbersError}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un barbero" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers?.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 3:
        return (
          <>
            <FormField
              control={control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}
                      disabled={
                        timesLoading ||
                        timesError ||
                        !watch("date") ||
                        !watch("barber")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes?.map((time) => (
                          <SelectItem key={time.time} value={time.time}>
                            {time.time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 4:
        return (
          <>
            <FormField
              control={control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="tuemail@ejemplo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Reserva tu turno</CardTitle>
          <CardDescription>
            Sigue los pasos para completar tu reserva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {renderStepContent()}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
          )}
          {step < 4 && (
            <Button
              type="button"
              onClick={async () => {
                const fieldsToValidate =
                  step === 1
                    ? ["service"]
                    : step === 2
                      ? ["barber"]
                      : ["date", "time"];
                const valid = await trigger(fieldsToValidate);
                if (valid) nextStep();
              }}
              disabled={reservationLoading}
            >
              Siguiente <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
          {step === 4 && (
            <Button type="submit" disabled={isSubmitting || reservationLoading}>
              {isSubmitting || reservationLoading
                ? "Enviando..."
                : "Enviar Reserva"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReservationForm;
