"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
};

type Employee = {
  id: string;
  name: string;
  color: string;
};

type Schedule = {
  [date: string]: {
    [employeeId: string]: string[];
  };
};

const initialServices: Service[] = [
  { id: "1", name: "Haircut", duration: 30, price: 25 },
  { id: "2", name: "Beard Shave", duration: 15, price: 15 },
  { id: "3", name: "Haircut + Beard Shave", duration: 45, price: 35 },
];

const initialEmployees: Employee[] = [
  { id: "1", name: "John Doe", color: "#4285F4" },
  { id: "2", name: "Jane Smith", color: "#34A853" },
  { id: "3", name: "Mike Johnson", color: "#FBBC05" },
];

const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export function ServiceManager() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [newService, setNewService] = useState<Omit<Service, "id">>({
    name: "",
    duration: 0,
    price: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, "id">>({
    name: "",
    color: "#000000",
  });
  const [schedule, setSchedule] = useState<Schedule>({});
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleServiceChange = (
    id: string,
    field: keyof Service,
    value: string | number,
  ) => {
    setServices(
      services.map((service) =>
        service.id === id ? { ...service, [field]: value } : service,
      ),
    );
  };

  const handleNewServiceChange = (
    field: keyof Omit<Service, "id">,
    value: string | number,
  ) => {
    setNewService({ ...newService, [field]: value });
  };

  const addService = () => {
    if (newService.name && newService.duration && newService.price) {
      setServices([...services, { ...newService, id: Date.now().toString() }]);
      setNewService({ name: "", duration: 0, price: 0 });
      toast({
        title: "Service added",
        description: `${newService.name} has been added to your services.`,
      });
    }
  };

  const saveServices = async () => {
    console.log(services);
    toast({
      title: "Services saved",
      description: "Your services have been updated successfully.",
    });
  };

  const handleEmployeeChange = (field: keyof Employee, value: string) => {
    if (editingEmployee) {
      setEditingEmployee({ ...editingEmployee, [field]: value });
    } else {
      setNewEmployee({ ...newEmployee, [field]: value });
    }
  };

  const addEmployee = () => {
    if (newEmployee.name && newEmployee.color) {
      setEmployees([
        ...employees,
        { ...newEmployee, id: Date.now().toString() },
      ]);
      setNewEmployee({ name: "", color: "#000000" });
      toast({
        title: "Employee added",
        description: `${newEmployee.name} has been added to your team.`,
      });
    }
  };

  const updateEmployee = () => {
    if (editingEmployee) {
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id ? editingEmployee : emp,
        ),
      );
      setEditingEmployee(null);
      toast({
        title: "Employee updated",
        description: `${editingEmployee.name}'s information has been updated.`,
      });
    }
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter((emp) => emp.id !== id));
    toast({
      title: "Employee removed",
      description: "The employee has been removed from your team.",
    });
  };

  const toggleTimeSlot = (
    date: string,
    employeeId: string,
    timeSlot: string,
  ) => {
    setSchedule((prevSchedule) => {
      const newSchedule = { ...prevSchedule };
      if (!newSchedule[date]) {
        newSchedule[date] = {};
      }
      if (!newSchedule[date][employeeId]) {
        newSchedule[date][employeeId] = [];
      }
      if (newSchedule[date][employeeId].includes(timeSlot)) {
        newSchedule[date][employeeId] = newSchedule[date][employeeId].filter(
          (t) => t !== timeSlot,
        );
      } else {
        newSchedule[date][employeeId] = [
          ...newSchedule[date][employeeId],
          timeSlot,
        ].sort();
      }
      return newSchedule;
    });
  };

  const saveSchedule = async () => {
    console.log(schedule);
    toast({
      title: "Schedule saved",
      description: "Your employee schedule has been updated successfully.",
    });
  };

  const getWeekDates = (startDate: Date): Date[] => {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const weekDates = getWeekDates(currentWeek);

  const nextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prev);
  };

  return (
    <Tabs defaultValue="services" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
        <TabsTrigger value="schedule">Employee Schedule</TabsTrigger>
      </TabsList>
      <TabsContent value="services">
        <Card>
          <CardHeader>
            <CardTitle>Manage Services</CardTitle>
          </CardHeader>
          <CardContent>
            {services.map((service) => (
              <div key={service.id} className="mb-4 grid grid-cols-3 gap-4">
                <Input
                  value={service.name}
                  onChange={(e) =>
                    handleServiceChange(service.id, "name", e.target.value)
                  }
                  placeholder="Service name"
                />
                <Input
                  type="number"
                  value={service.duration}
                  onChange={(e) =>
                    handleServiceChange(
                      service.id,
                      "duration",
                      parseInt(e.target.value),
                    )
                  }
                  placeholder="Duration (minutes)"
                />
                <Input
                  type="number"
                  value={service.price}
                  onChange={(e) =>
                    handleServiceChange(
                      service.id,
                      "price",
                      parseFloat(e.target.value),
                    )
                  }
                  placeholder="Price"
                />
              </div>
            ))}
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold">Add New Service</h3>
              <div className="mb-2 grid grid-cols-3 gap-4">
                <Input
                  value={newService.name}
                  onChange={(e) =>
                    handleNewServiceChange("name", e.target.value)
                  }
                  placeholder="Service name"
                />
                <Input
                  type="number"
                  value={newService.duration || ""}
                  onChange={(e) =>
                    handleNewServiceChange("duration", parseInt(e.target.value))
                  }
                  placeholder="Duration (minutes)"
                />
                <Input
                  type="number"
                  value={newService.price || ""}
                  onChange={(e) =>
                    handleNewServiceChange("price", parseFloat(e.target.value))
                  }
                  placeholder="Price"
                />
              </div>
              <Button onClick={addService}>Add Service</Button>
            </div>
            <Button onClick={saveServices} className="mt-6">
              Save All Services
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="employees">
        <Card>
          <CardHeader>
            <CardTitle>Manage Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.map((employee) => (
              <div key={employee.id} className="mb-4 flex items-center gap-4">
                <Input
                  value={employee.name}
                  onChange={(e) => handleEmployeeChange("name", e.target.value)}
                  placeholder="Employee name"
                  className="grow"
                />
                <Input
                  type="color"
                  value={employee.color}
                  onChange={(e) =>
                    handleEmployeeChange("color", e.target.value)
                  }
                  className="w-16"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setEditingEmployee(employee)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit Employee</DialogTitle>
                      <DialogDescription>
                        Make changes to the employee&apos;s information here.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={editingEmployee?.name || ""}
                          onChange={(e) =>
                            handleEmployeeChange("name", e.target.value)
                          }
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="color" className="text-right">
                          Color
                        </Label>
                        <Input
                          id="color"
                          type="color"
                          value={editingEmployee?.color || ""}
                          onChange={(e) =>
                            handleEmployeeChange("color", e.target.value)
                          }
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={updateEmployee}>
                        Save changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeEmployee(employee.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold">Add New Employee</h3>
              <div className="mb-2 flex items-center gap-4">
                <Input
                  value={newEmployee.name}
                  onChange={(e) => handleEmployeeChange("name", e.target.value)}
                  placeholder="Employee name"
                  className="grow"
                />
                <Input
                  type="color"
                  value={newEmployee.color}
                  onChange={(e) =>
                    handleEmployeeChange("color", e.target.value)
                  }
                  className="w-16"
                />
                <Button onClick={addEmployee}>
                  <Plus className="mr-2 size-4" />
                  Add Employee
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="schedule">
        <Card>
          <CardHeader>
            <CardTitle>Manage Employee Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <Button onClick={prevWeek} variant="outline" size="icon">
                <ChevronLeft className="size-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {weekDates[0].toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {weekDates[6].toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <Button onClick={nextWeek} variant="outline" size="icon">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid grid-cols-8 gap-px bg-gray-200">
                  <div className="sticky left-0 z-10 bg-background"></div>
                  {weekDates.map((date, index) => (
                    <div
                      key={index}
                      className="bg-white p-2 text-center font-semibold"
                    >
                      <div>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div>{date.getDate()}</div>
                    </div>
                  ))}
                  {timeSlots.map((time, timeIndex) => (
                    <div key={time}>
                      <div className="sticky left-0 z-10 bg-white p-2 text-right">
                        {time}
                      </div>
                      {weekDates.map((date, dateIndex) => (
                        <div
                          key={`${dateIndex}-${timeIndex}`}
                          className="relative h-16 border-t border-gray-200 bg-white"
                        >
                          {employees.map((employee, empIndex) => {
                            const isScheduled =
                              schedule[formatDate(date)]?.[
                                employee.id
                              ]?.includes(time);
                            return (
                              <div
                                key={`${dateIndex}-${timeIndex}-${empIndex}`}
                                className={`absolute left-0 top-0 size-full cursor-pointer transition-opacity ${isScheduled ? "opacity-100" : "opacity-0 hover:opacity-50"}`}
                                style={{
                                  backgroundColor: employee.color,
                                  top: `${(empIndex / employees.length) * 100}%`,
                                  height: `${100 / employees.length}%`,
                                }}
                                onClick={() =>
                                  toggleTimeSlot(
                                    formatDate(date),
                                    employee.id,
                                    time,
                                  )
                                }
                                title={`${employee.name} - ${time}`}
                              ></div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 font-semibold">Employee Legend</h4>
              <div className="flex flex-wrap gap-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center">
                    <div
                      className="mr-2 size-4"
                      style={{ backgroundColor: employee.color }}
                    ></div>
                    <span>{employee.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={saveSchedule} className="mt-6">
              Save Schedule
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
