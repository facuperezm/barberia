"use client";

import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";

export const SignOutButton = () => {
  const { signOut } = useClerk();

  return (
    <Button variant="ghost" onClick={() => signOut({ redirectUrl: "/" })}>
      Cerrar sesión
    </Button>
  );
};
