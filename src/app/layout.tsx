import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import NProgress from "@/components/nprogress";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Modern Barbershop",
  description: "Book your next haircut with our professional barbers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <NProgress />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
