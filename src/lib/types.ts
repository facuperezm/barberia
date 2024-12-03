export interface Barber {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
}

export interface Booking {
  id: number;
  customerName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  customerEmail: string;
  customerPhone: string;
}

export interface Service {
  description: string | null;
  id: number;
  name: string;
  createdAt: Date | null;
  price: number;
  duration: number;
}
