import {
  barbers,
  services,
  scheduleOverrides,
  appointments,
} from "@/drizzle/schema";
import { db } from "@/drizzle";
import { faker } from "@faker-js/faker";

async function seed() {
  try {
    // **1. Clear Existing Data**
    // It's a good practice to clear existing data to prevent duplication.
    await db.delete(appointments).execute();
    await db.delete(scheduleOverrides).execute();
    await db.delete(services).execute();
    await db.delete(barbers).execute();

    // **2. Seed Barbers with Default Working Hours**
    const barbersData = [
      {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "555-1234",
        imageUrl:
          "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&auto=format&fit=crop",
        defaultWorkingHours: {
          Monday: {
            isWorking: true,
            slots: [{ start: "09:00:00", end: "17:00:00" }],
          },
          Tuesday: {
            isWorking: true,
            slots: [{ start: "09:00:00", end: "17:00:00" }],
          },
          Wednesday: {
            isWorking: true,
            slots: [{ start: "09:00:00", end: "17:00:00" }],
          },
          Thursday: {
            isWorking: true,
            slots: [{ start: "09:00:00", end: "17:00:00" }],
          },
          Friday: {
            isWorking: true,
            slots: [{ start: "09:00:00", end: "17:00:00" }],
          },
          Saturday: {
            isWorking: false,
            slots: [],
          },
          Sunday: {
            isWorking: false,
            slots: [],
          },
        },
      },
      {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "555-5678",
        imageUrl:
          "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&auto=format&fit=crop",
        defaultWorkingHours: {
          Monday: {
            isWorking: false,
            slots: [],
          },
          Tuesday: {
            isWorking: true,
            slots: [{ start: "10:00:00", end: "18:00:00" }],
          },
          Wednesday: {
            isWorking: true,
            slots: [{ start: "10:00:00", end: "18:00:00" }],
          },
          Thursday: {
            isWorking: true,
            slots: [{ start: "10:00:00", end: "18:00:00" }],
          },
          Friday: {
            isWorking: true,
            slots: [{ start: "10:00:00", end: "18:00:00" }],
          },
          Saturday: {
            isWorking: true,
            slots: [{ start: "10:00:00", end: "18:00:00" }],
          },
          Sunday: {
            isWorking: false,
            slots: [],
          },
        },
      },
    ];

    const insertedBarbers = await db
      .insert(barbers)
      .values(barbersData)
      .returning();

    // **3. Seed Services**
    const servicesData = [
      {
        name: "Classic Haircut",
        duration: 30,
        price: 30.0,
        description: "Traditional haircut with styling",
      },
      {
        name: "Beard Trim",
        duration: 20,
        price: 20.0,
        description: "Professional beard grooming",
      },
      {
        name: "Full Service",
        duration: 60,
        price: 50.0,
        description: "Haircut, beard trim, and styling",
      },
    ];

    const insertedServices = await db
      .insert(services)
      .values(servicesData)
      .returning();

    // **4. Seed Schedule Overrides**
    const scheduleOverridesData = [
      {
        barberId: insertedBarbers.find((b) => b.name === "John Doe")!.id,
        date: "2023-10-01",
        isWorkingDay: false,
        availableSlots: [],
        reason: "Public Holiday",
      },
      {
        barberId: insertedBarbers.find((b) => b.name === "Jane Smith")!.id,
        date: "2023-10-02",
        isWorkingDay: true,
        availableSlots: [
          { start: "10:00:00", end: "14:00:00" },
          { start: "15:00:00", end: "18:00:00" },
        ],
        reason: "Partial Day",
      },
      // Add more fixed entries as needed
    ];

    // **Alternatively, using faker for dynamic schedule overrides**
    const dynamicOverrides = Array.from({ length: 5 }, () => ({
      barberId:
        insertedBarbers[Math.floor(Math.random() * insertedBarbers.length)].id,
      date: faker.date.future().toISOString().split("T")[0], // Convert to 'YYYY-MM-DD'
      isWorkingDay: faker.datatype.boolean(),
      availableSlots: faker.datatype.boolean()
        ? [
            { start: "09:00:00", end: "12:00:00" },
            { start: "13:00:00", end: "17:00:00" },
          ]
        : [],
      reason: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    }));

    await db
      .insert(scheduleOverrides)
      .values([...scheduleOverridesData, ...dynamicOverrides])
      .execute();

    // **5. Seed Appointments**
    const appointmentsData = [
      {
        barberId: insertedBarbers.find((b) => b.name === "John Doe")!.id,
        serviceId: insertedServices.find((s) => s.name === "Classic Haircut")!
          .id,
        customerName: "Alice Johnson",
        customerEmail: "alice.johnson@example.com",
        customerPhone: "555-9012",
        date: "2023-11-13", // Changed from Date object to string
        time: "09:00:00",
        status: "confirmed",
      },
      {
        barberId: insertedBarbers.find((b) => b.name === "John Doe")!.id,
        serviceId: insertedServices.find((s) => s.name === "Beard Trim")!.id,
        customerName: "Bob Williams",
        customerEmail: "bob.williams@example.com",
        customerPhone: "555-3456",
        date: "2023-11-13", // Changed from Date object to string
        time: "10:00:00",
        status: "pending",
      },
      {
        barberId: insertedBarbers.find((b) => b.name === "Jane Smith")!.id,
        serviceId: insertedServices.find((s) => s.name === "Full Service")!.id,
        customerName: "Charlie Brown",
        customerEmail: "charlie.brown@example.com",
        customerPhone: "555-7890",
        date: "2023-11-14", // Changed from Date object to string
        time: "11:00:00",
        status: "confirmed",
      },
    ];

    await db.insert(appointments).values(appointmentsData).execute();

    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    // Optional: Close the database connection if necessary
  }
}

seed();
