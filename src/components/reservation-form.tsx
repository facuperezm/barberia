import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Scissors,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { sendConfirmationEmail } from "@/lib/email";
import { useToast } from "@/hooks/use-toast";
import { getSchedule } from "@/lib/actions/actions"; // Import the getSchedule function

const formSchema = z.object({
  barber: z.string(),
  service: z.string(),
  date: z.date(),
  time: z.string(),
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." }),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number." }),
  email: z.string().email({ message: "Invalid email address." }),
});

type BarberType = { id: string; name: string };
type ServiceType = {
  id: string;
  name: string;
  duration: number;
  price: number;
};
type ScheduleType = Record<string, string[]>;

const mockBarbers: BarberType[] = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Mike Johnson" },
];

const mockServices: ServiceType[] = [
  { id: "1", name: "Haircut", duration: 30, price: 25 },
  { id: "2", name: "Shave", duration: 30, price: 20 },
  { id: "3", name: "Haircut & Shave", duration: 60, price: 40 },
];

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export function ReservationForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleType>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barber: "",
      service: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
    },
  });

  // useEffect(() => {
  //   const fetchSchedule = async () => {
  //     try {
  //       const scheduleData = await getSchedule(); // Directly call the getSchedule function
  //       setSchedule(scheduleData);
  //     } catch (error) {
  //       console.error("Error fetching schedule:", error);
  //       toast({
  //         title: "Error",
  //         description: "Failed to fetch schedule.",
  //       });
  //     }
  //   };

  //   fetchSchedule();
  // }, []);

  const getDayName = (date: Date) => {
    return [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][date.getDay()];
  };

  const isDateAvailable = (date: Date) => {
    const dayName = getDayName(date);
    return schedule[dayName] && schedule[dayName].length > 0;
  };

  const getAvailableTimeSlots = (date: Date, serviceId: string) => {
    const dayName = getDayName(date);
    const daySchedule = schedule[dayName] || [];
    const service = mockServices.find((s) => s.id === serviceId);
    if (!service) return [];

    return daySchedule.filter((time) => {
      const startTime = new Date(`${date.toDateString()} ${time}`);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
      const nextSlotIndex = timeSlots.indexOf(time) + 1;
      const nextSlot = timeSlots[nextSlotIndex];
      return (
        !nextSlot || endTime <= new Date(`${date.toDateString()} ${nextSlot}`)
      );
    });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    // Here you would typically send the form data to your server
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulating API call
    setIsSubmitting(false);

    // Send confirmation email
    await sendConfirmationEmail(values);

    toast({
      title: "Reservation submitted!",
      description:
        "We've sent you a confirmation email with your appointment details.",
    });
    form.reset();
    setSelectedDate(new Date());
    setStep(0);
  }

  const renderCalendar = () => {
    const startDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const endDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );
    const startDay = startDate.getDay();
    const totalDays = endDate.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i,
      );
      const isSelected =
        selectedDate && date.toDateString() === selectedDate.toDateString();
      const isAvailable = isDateAvailable(date);
      days.push(
        <div
          key={i}
          className={`cursor-pointer p-2 text-center ${
            isSelected ? "bg-primary text-primary-foreground" : ""
          } ${isAvailable ? "hover:bg-primary/20" : "cursor-not-allowed opacity-50"}`}
          onClick={() => isAvailable && setSelectedDate(date)}
        >
          {i}
        </div>,
      );
    }

    return (
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-semibold">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-semibold">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  const renderTimeSlots = () => {
    const availableSlots = getAvailableTimeSlots(
      selectedDate,
      form.getValues("service"),
    );
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {availableSlots.map((time) => (
          <Button
            key={time}
            variant={form.getValues("time") === time ? "default" : "outline"}
            onClick={() => form.setValue("time", time)}
          >
            {time}
          </Button>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <FormField
            control={form.control}
            name="barber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Choose your barber</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    {mockBarbers.map((barber) => (
                      <FormItem
                        className="flex items-center space-x-3 space-y-0"
                        key={barber.id}
                      >
                        <FormControl>
                          <RadioGroupItem value={barber.id} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {barber.name}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 1:
        return (
          <FormField
            control={form.control}
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Select a service</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mockServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price} ({service.duration}{" "}
                        min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 2:
        return (
          <>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Select a date and time
                  </FormLabel>
                  <FormControl>{renderCalendar()}</FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedDate && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Available time slots
                    </FormLabel>
                    <FormControl>{renderTimeSlots()}</FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        );
      case 3:
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-100 to-gray-300 p-4">
      <Card className="mx-auto w-full max-w-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center justify-center text-2xl font-bold">
            <Scissors className="mr-2 size-6" /> Book Your Style
          </CardTitle>
          <CardDescription className="text-center">
            Step {step + 1} of 4:{" "}
            {
              [
                "Choose Barber",
                "Select Service",
                "Pick Date & Time",
                "Your Details",
              ][step]
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {renderStepContent()}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={nextStep}>
              Next <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
          {step === 3 && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
