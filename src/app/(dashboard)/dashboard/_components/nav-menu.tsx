import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";

export default function NavMenu() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 font-semibold">
            <h1 className="text-xl font-bold leading-tight">Barberia</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <span className="text-sm text-muted-foreground hover:underline">
              Volver a la web
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
