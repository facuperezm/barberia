import { redirect } from "next/navigation";

// Redirect to the unified team page
export default function BarbersPage() {
  redirect("/dashboard/team");
}
