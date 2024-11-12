"use client";

import { Calendar, Home, Scissors, Users, UserSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./sidebar-nav-user";
import { useUser } from "@clerk/nextjs";

// Menu items.
const items = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Schedule",
    url: "/dashboard/schedule",
    icon: Calendar,
  },
  {
    title: "Services",
    url: "/dashboard/services",
    icon: Scissors,
  },
  {
    title: "Barbers",
    url: "/dashboard/barbers",
    icon: Users,
  },
  {
    title: "Employees",
    url: "/dashboard/employees",
    icon: UserSquare,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const userData = {
    name: user?.fullName ?? "",
    email: user?.emailAddresses[0].emailAddress ?? "",
    avatar: user?.imageUrl ?? "",
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col justify-between">
        <SidebarGroup>
          <SidebarGroupLabel>Barberia</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    isActive={pathname === item.url}
                    asChild
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
