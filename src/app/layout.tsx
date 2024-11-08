import "./../styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import NProgress from "@/components/nprogress";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
          <Suspense fallback={<Skeleton className="h-4 w-full" />}>
            <NProgress />
            {children}
            <Toaster />
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
