export interface Barber {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
}
