import { redirect } from "next/navigation";

// Redirect to the unified team page
export default function EmployeesPage() {
  redirect("/dashboard/team");
}
