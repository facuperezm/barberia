import {
  salons,
  barbers,
  services,
  customers,
  scheduleOverrides,
  appointments,
  workingHours,
  ratings,
  payments,
} from "@/drizzle/schema";
import { db } from "@/drizzle";
import { faker } from "@faker-js/faker";

async function seed() {
  try {
    console.log("🚀 Starting database seeding...");
    console.time("⏱️  Total seeding time");

    // Everything runs in a single transaction: if any insert fails (e.g. the
    // appointments_no_double_booking exclusion constraint), the whole seed
    // rolls back instead of leaving the DB half-populated.
    const summary = await db.transaction(async (tx) => {
      // **1. Clear Existing Data**
      console.log("\n🧹 Clearing existing data...");
      console.time("🧹 Clear data");
      await tx.delete(payments);
      await tx.delete(ratings);
      await tx.delete(appointments);
      await tx.delete(scheduleOverrides);
      await tx.delete(workingHours);
      await tx.delete(customers);
      await tx.delete(services);
      await tx.delete(barbers);
      await tx.delete(salons);
      console.timeEnd("🧹 Clear data");

      // **2. Seed Salons**
      console.log("\n🏪 Seeding salons...");
      console.time("🏪 Seed salons");
      const salonsData = [
        {
          name: "Elite Barbershop",
          slug: "elite-barbershop",
          ownerName: "Michael Rodriguez",
          email: "owner@elitebarbershop.com",
          phone: "555-0001",
          address: "123 Main Street, Downtown, City 12345",
          timezone: "America/New_York",
          isActive: true,
        },
      ];

      const insertedSalons = await tx
        .insert(salons)
        .values(salonsData)
        .returning();
      const mainSalon = insertedSalons[0]!;
      console.timeEnd("🏪 Seed salons");

      // **3. Seed Barbers**
      console.log("\n💇‍♂️ Seeding barbers...");
      console.time("💇‍♂️ Seed barbers");
      const barbersData = [
        {
          salonId: mainSalon.id,
          name: "John Doe",
          email: "john.doe@elitebarbershop.com",
          phone: "555-1234",
          imageUrl:
            "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&auto=format&fit=crop",
          bio: "Master barber with 10+ years of experience specializing in classic cuts and modern styles.",
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Jane Smith",
          email: "jane.smith@elitebarbershop.com",
          phone: "555-5678",
          imageUrl:
            "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&auto=format&fit=crop",
          bio: "Expert in beard grooming and precision cutting with a passion for customer satisfaction.",
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Carlos Martinez",
          email: "carlos.martinez@elitebarbershop.com",
          phone: "555-9999",
          imageUrl:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&auto=format&fit=crop",
          bio: "Trendsetting stylist known for creative designs and attention to detail.",
          isActive: true,
        },
      ];

      const insertedBarbers = await tx
        .insert(barbers)
        .values(barbersData)
        .returning();
      console.timeEnd("💇‍♂️ Seed barbers");

      // **4. Seed Services**
      console.log("\n✂️ Seeding services...");
      console.time("✂️ Seed services");
      const servicesData = [
        {
          salonId: mainSalon.id,
          name: "Classic Haircut",
          description: "Traditional haircut with styling and finish",
          priceCents: 3000, // $30.00
          durationMinutes: 30,
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Beard Trim",
          description: "Professional beard grooming and shaping",
          priceCents: 2000, // $20.00
          durationMinutes: 20,
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Full Service",
          description: "Complete haircut, beard trim, and hot towel treatment",
          priceCents: 5000, // $50.00
          durationMinutes: 60,
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Kids Haircut",
          description: "Gentle haircut for children under 12",
          priceCents: 2500, // $25.00
          durationMinutes: 25,
          isActive: true,
        },
        {
          salonId: mainSalon.id,
          name: "Senior Cut",
          description: "Discounted haircut for seniors 65+",
          priceCents: 2500, // $25.00
          durationMinutes: 30,
          isActive: true,
        },
      ];

      const insertedServices = await tx
        .insert(services)
        .values(servicesData)
        .returning();
      console.timeEnd("✂️ Seed services");

      // **5. Seed Customers**
      console.log("\n👥 Seeding customers...");
      console.time("👥 Seed customers");
      const customersData = [
        {
          salonId: mainSalon.id,
          name: "Alice Johnson",
          email: "alice.johnson@example.com",
          phone: "555-9012",
        },
        {
          salonId: mainSalon.id,
          name: "Bob Williams",
          email: "bob.williams@example.com",
          phone: "555-3456",
        },
        {
          salonId: mainSalon.id,
          name: "Charlie Brown",
          email: "charlie.brown@example.com",
          phone: "555-7890",
        },
        {
          salonId: mainSalon.id,
          name: "Diana Prince",
          email: "diana.prince@example.com",
          phone: "555-2468",
          notes: "Prefers shorter cuts, allergic to certain hair products",
        },
        {
          salonId: mainSalon.id,
          name: "Edward Norton",
          email: "edward.norton@example.com",
          phone: "555-1357",
          notes: "Regular customer, likes traditional styles",
        },
      ];

      // Generate additional random customers
      const randomCustomers = Array.from({ length: 15 }, () => ({
        salonId: mainSalon.id,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      }));

      const insertedCustomers = await tx
        .insert(customers)
        .values([...customersData, ...randomCustomers])
        .returning();
      console.timeEnd("👥 Seed customers");

      // **6. Seed Working Hours**
      console.log("\n🕒 Seeding working hours...");
      console.time("🕒 Seed working hours");
      const workingHoursData = insertedBarbers.flatMap((barber) => {
        const isJohn = barber.name === "John Doe";
        const isJane = barber.name === "Jane Smith";

        let schedule;
        if (isJohn) {
          // John works Mon-Fri 9-5
          schedule = {
            Monday: { isWorking: true, start: "09:00:00", end: "17:00:00" },
            Tuesday: { isWorking: true, start: "09:00:00", end: "17:00:00" },
            Wednesday: { isWorking: true, start: "09:00:00", end: "17:00:00" },
            Thursday: { isWorking: true, start: "09:00:00", end: "17:00:00" },
            Friday: { isWorking: true, start: "09:00:00", end: "17:00:00" },
            Saturday: { isWorking: false, start: "09:00:00", end: "17:00:00" }, // Dummy times for non-working day
            Sunday: { isWorking: false, start: "09:00:00", end: "17:00:00" }, // Dummy times for non-working day
          };
        } else if (isJane) {
          // Jane works Tue-Sat 10-6
          schedule = {
            Monday: { isWorking: false, start: "10:00:00", end: "18:00:00" }, // Dummy times
            Tuesday: { isWorking: true, start: "10:00:00", end: "18:00:00" },
            Wednesday: { isWorking: true, start: "10:00:00", end: "18:00:00" },
            Thursday: { isWorking: true, start: "10:00:00", end: "18:00:00" },
            Friday: { isWorking: true, start: "10:00:00", end: "18:00:00" },
            Saturday: { isWorking: true, start: "10:00:00", end: "18:00:00" },
            Sunday: { isWorking: false, start: "10:00:00", end: "18:00:00" }, // Dummy times
          };
        } else {
          // Carlos works Wed-Sun 11-7
          schedule = {
            Monday: { isWorking: false, start: "11:00:00", end: "19:00:00" }, // Dummy times
            Tuesday: { isWorking: false, start: "11:00:00", end: "19:00:00" }, // Dummy times
            Wednesday: { isWorking: true, start: "11:00:00", end: "19:00:00" },
            Thursday: { isWorking: true, start: "11:00:00", end: "19:00:00" },
            Friday: { isWorking: true, start: "11:00:00", end: "19:00:00" },
            Saturday: { isWorking: true, start: "11:00:00", end: "19:00:00" },
            Sunday: { isWorking: true, start: "11:00:00", end: "19:00:00" },
          };
        }

        return Object.entries(schedule).map(
          ([day, { isWorking, start, end }]) => ({
            barberId: barber.id,
            dayOfWeek: getDayOfWeekNumber(day),
            startTime: start,
            endTime: end,
            isWorking,
          }),
        );
      });

      await tx.insert(workingHours).values(workingHoursData);
      console.timeEnd("🕒 Seed working hours");

      // **7. Seed Schedule Overrides**
      console.log("\n📅 Seeding schedule overrides...");
      console.time("📅 Seed schedule overrides");
      const today = new Date();
      const futureDate1 = new Date(today);
      futureDate1.setDate(today.getDate() + 7);
      const futureDate2 = new Date(today);
      futureDate2.setDate(today.getDate() + 14);

      const scheduleOverridesData = [
        {
          barberId: insertedBarbers.find((b) => b.name === "John Doe")!.id,
          date: futureDate1.toISOString().split("T")[0],
          isWorkingDay: false,
          availableSlots: null,
          reason: "Public Holiday - Thanksgiving",
        },
        {
          barberId: insertedBarbers.find((b) => b.name === "Jane Smith")!.id,
          date: futureDate2.toISOString().split("T")[0],
          isWorkingDay: true,
          availableSlots: [
            { start: "10:00", end: "14:00" },
            { start: "15:00", end: "18:00" },
          ],
          reason: "Doctor's appointment - shortened day",
        },
      ];

      // Generate dynamic schedule overrides
      const dynamicOverrides = Array.from({ length: 5 }, () => ({
        barberId:
          insertedBarbers[
            Math.floor(Math.random() * insertedBarbers.length)
          ]!.id,
        date: faker.date.future().toISOString().split("T")[0],
        isWorkingDay: faker.datatype.boolean(),
        availableSlots: faker.datatype.boolean()
          ? [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ]
          : null,
        reason: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      }));

      await tx
        .insert(scheduleOverrides)
        .values([...scheduleOverridesData, ...dynamicOverrides]);
      console.timeEnd("📅 Seed schedule overrides");

      // **8. Seed Appointments**
      console.log("\n📋 Seeding appointments...");
      console.time("📋 Seed appointments");

      // Reserve a unique on-the-hour start per (barber, day) so no two
      // appointments for the same barber overlap. Every service is <= 60 min
      // and starts on the hour, so a distinct start hour guarantees the
      // [appointment_at, end_time) ranges never intersect — which is exactly
      // what appointments_no_double_booking enforces.
      const takenSlots = new Set<string>();
      const reserveStart = (barberId: number, daySpan: "past" | "future") => {
        for (let attempt = 0; attempt < 500; attempt++) {
          const offset = faker.number.int({ min: 1, max: 30 });
          const start = new Date(today);
          start.setDate(today.getDate() + (daySpan === "past" ? -offset : offset));
          const hour = faker.number.int({ min: 9, max: 17 });
          start.setHours(hour, 0, 0, 0);

          const key = `${barberId}|${start.toDateString()}|${hour}`;
          if (!takenSlots.has(key)) {
            takenSlots.add(key);
            return start;
          }
        }
        throw new Error(`Could not find a free appointment slot for ${barberId}`);
      };

      const appointmentsData = [];

      // Create some past appointments for rating purposes
      for (let i = 0; i < 10; i++) {
        const randomBarber =
          insertedBarbers[Math.floor(Math.random() * insertedBarbers.length)]!;
        const randomService =
          insertedServices[
            Math.floor(Math.random() * insertedServices.length)
          ]!;
        const randomCustomer =
          insertedCustomers[
            Math.floor(Math.random() * insertedCustomers.length)
          ]!;

        const appointmentStart = reserveStart(randomBarber.id, "past");
        const appointmentEnd = new Date(appointmentStart);
        appointmentEnd.setMinutes(
          appointmentStart.getMinutes() + randomService.durationMinutes,
        );

        appointmentsData.push({
          salonId: mainSalon.id,
          barberId: randomBarber.id,
          serviceId: randomService.id,
          customerId: randomCustomer.id,
          appointmentAt: appointmentStart,
          endTime: appointmentEnd,
          status: "completed" as const,
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        });
      }

      // Create some future appointments
      for (let i = 0; i < 15; i++) {
        const randomBarber =
          insertedBarbers[Math.floor(Math.random() * insertedBarbers.length)]!;
        const randomService =
          insertedServices[
            Math.floor(Math.random() * insertedServices.length)
          ]!;
        const randomCustomer =
          insertedCustomers[
            Math.floor(Math.random() * insertedCustomers.length)
          ]!;

        const appointmentStart = reserveStart(randomBarber.id, "future");
        const appointmentEnd = new Date(appointmentStart);
        appointmentEnd.setMinutes(
          appointmentStart.getMinutes() + randomService.durationMinutes,
        );

        const statuses = ["pending", "confirmed", "cancelled"] as const;

        appointmentsData.push({
          salonId: mainSalon.id,
          barberId: randomBarber.id,
          serviceId: randomService.id,
          customerId: randomCustomer.id,
          appointmentAt: appointmentStart,
          endTime: appointmentEnd,
          status: statuses[Math.floor(Math.random() * statuses.length)]!,
          notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        });
      }

      const insertedAppointments = await tx
        .insert(appointments)
        .values(appointmentsData)
        .returning();
      console.timeEnd("📋 Seed appointments");

      // **9. Seed Ratings**
      console.log("\n⭐ Seeding ratings...");
      console.time("⭐ Seed ratings");

      const completedAppointments = insertedAppointments.filter(
        (app) => app.status === "completed",
      );

      const ratingsData = completedAppointments
        .filter(() => faker.datatype.boolean()) // Not all completed appointments get rated
        .map((appointment) => ({
          appointmentId: appointment.id,
          rating: faker.number.int({ min: 3, max: 5 }), // Mostly positive ratings
          comment: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
        }));

      if (ratingsData.length > 0) {
        await tx.insert(ratings).values(ratingsData);
      }
      console.timeEnd("⭐ Seed ratings");

      // **10. Seed Payments**
      console.log("\n💳 Seeding payments...");
      console.time("💳 Seed payments");

      const paymentsData = insertedAppointments
        .filter(
          (app) => app.status === "completed" || app.status === "confirmed",
        )
        .map((appointment) => {
          const service = insertedServices.find(
            (s) => s.id === appointment.serviceId,
          )!;
          const methods = ["cash", "card", "stripe"] as const;
          const statuses =
            appointment.status === "completed"
              ? (["succeeded"] as const)
              : (["pending", "succeeded"] as const);

          return {
            appointmentId: appointment.id,
            amountCents: service.priceCents,
            method: methods[Math.floor(Math.random() * methods.length)]!,
            status: statuses[Math.floor(Math.random() * statuses.length)]!,
            stripePaymentIntentId: faker.datatype.boolean()
              ? `pi_${faker.string.alphanumeric(24)}`
              : null,
          };
        });

      if (paymentsData.length > 0) {
        await tx.insert(payments).values(paymentsData);
      }
      console.timeEnd("💳 Seed payments");

      return {
        salons: insertedSalons.length,
        barbers: insertedBarbers.length,
        services: insertedServices.length,
        customers: insertedCustomers.length,
        workingHours: workingHoursData.length,
        scheduleOverrides: scheduleOverridesData.length + dynamicOverrides.length,
        appointments: appointmentsData.length,
        ratings: ratingsData.length,
        payments: paymentsData.length,
      };
    });

    console.timeEnd("⏱️  Total seeding time");
    console.log("\n🎉 Database seeded successfully!");
    console.log("📊 Summary:");
    console.log(`   🏪 Inserted ${summary.salons} salon(s)`);
    console.log(`   💇‍♂️ Inserted ${summary.barbers} barbers`);
    console.log(`   ✂️ Inserted ${summary.services} services`);
    console.log(`   👥 Inserted ${summary.customers} customers`);
    console.log(`   🕒 Inserted ${summary.workingHours} working hour records`);
    console.log(`   📅 Inserted ${summary.scheduleOverrides} schedule overrides`);
    console.log(`   📋 Inserted ${summary.appointments} appointments`);
    console.log(`   ⭐ Inserted ${summary.ratings} ratings`);
    console.log(`   💳 Inserted ${summary.payments} payments`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

function getDayOfWeekNumber(day: string): number {
  const days: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return days[day] ?? 0;
}

// Execute the seed function with proper error handling and process exit
(async () => {
  try {
    await seed();
    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Seeding failed:", error);
    process.exit(1);
  }
})();
