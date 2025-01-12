"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EditEmployeeDialog } from "../../employees/_components/edit-employee";
import { getBarbers } from "@/server/actions/barbers";
import { useQuery } from "@tanstack/react-query";
import { type Barber } from "@/drizzle/schema";

export function EmployeeList({ initialBarbers }: { initialBarbers: Barber[] }) {
  const [employees, setEmployees] = useState(initialBarbers);
  const [editingEmployee, setEditingEmployee] = useState<Barber | null>(null);

  const { data: barbers } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getBarbers(),
    initialData: initialBarbers,
  });

  const handleDeleteEmployee = (id: number) => {
    setEmployees(employees.filter((emp) => emp.id !== id));
  };

  const handleEditEmployee = (updatedEmployee: Barber) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp,
      ),
    );
    setEditingEmployee(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your barbershop staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {barbers?.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center space-x-4">
                <Avatar className="size-12">
                  <AvatarImage src={employee.imageUrl!} alt={employee.name} />
                  <AvatarFallback>{employee.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p>{employee.name}</p>
                  <small>{employee.email}</small>
                  <small>{employee.phone}</small>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setEditingEmployee(employee)}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteEmployee(employee.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </CardContent>
      </Card>

      <EditEmployeeDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(open: boolean) => !open && setEditingEmployee(null)}
        onSave={handleEditEmployee}
      />
    </>
  );
}
