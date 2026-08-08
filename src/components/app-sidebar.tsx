"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Hotel, LifeBuoy, Zap } from "lucide-react";

import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export interface SidebarProperty {
  id: string;
  title: string;
  code: string;
  city: string;
  rooms: number;
  connected: boolean;
}

export interface SidebarBadges {
  arrivals: number;
  syncErrors: number;
  dirtyRooms: number;
}

export function AppSidebar({
  properties,
  activePropertyId,
  badges,
}: {
  properties: SidebarProperty[];
  activePropertyId: string;
  badges: SidebarBadges;
}) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const [selected, setSelected] = React.useState(activePropertyId);
  const active = properties.find((p) => p.id === selected) ?? properties[0];

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                  aria-label="Switch property"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Hotel className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">STAYBASE</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {active.code} · {active.rooms} rooms
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64" sideOffset={6}>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Properties
                </DropdownMenuLabel>
                {properties.map((property) => (
                  <DropdownMenuItem
                    key={property.id}
                    className="gap-2"
                    onSelect={() => setSelected(property.id)}
                  >
                    <div className="grid flex-1">
                      <span className="text-sm font-medium">{property.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {property.city} ·{" "}
                        {property.connected ? "Channex connected" : "Not connected"}
                      </span>
                    </div>
                    {property.id === selected ? <Check className="size-4" /> : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Manage properties</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {navigation.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const count = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        onClick={closeOnMobile}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                          {count > 0 ? (
                            <Badge
                              variant={
                                item.badgeKey === "syncErrors" ? "destructive" : "secondary"
                              }
                              className={cn(
                                "ml-auto h-5 min-w-5 justify-center px-1 text-[11px] tabular",
                                "group-data-[collapsible=icon]:hidden",
                              )}
                            >
                              {count}
                            </Badge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Connectivity status">
              <Link href="/channels">
                <Zap className={active.connected ? "text-emerald-500" : "text-amber-500"} />
                <span className="truncate">
                  {active.connected ? "Channex live" : "Channex pending"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Documentation">
              <a href="https://docs.channex.io" target="_blank" rel="noreferrer">
                <LifeBuoy />
                <span>Channex docs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
