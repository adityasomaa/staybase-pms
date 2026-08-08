import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  BrushCleaning,
  CalendarRange,
  ChartNoAxesCombined,
  ConciergeBell,
  LayoutDashboard,
  Plug,
  Settings,
  SquareStack,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badgeKey?: "arrivals" | "syncErrors" | "dirtyRooms";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Occupancy, ADR, RevPAR and today at a glance",
      },
      {
        title: "Rates & Availability",
        href: "/calendar",
        icon: CalendarRange,
        description: "Edit the ARI grid and push it to every channel",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Reservations",
        href: "/reservations",
        icon: SquareStack,
        description: "Every booking across direct and OTA channels",
      },
      {
        title: "Front Desk",
        href: "/front-desk",
        icon: ConciergeBell,
        description: "Arrivals, departures and in-house guests",
        badgeKey: "arrivals",
      },
      {
        title: "Housekeeping",
        href: "/housekeeping",
        icon: BrushCleaning,
        description: "Room status board and attendant assignments",
        badgeKey: "dirtyRooms",
      },
      {
        title: "Guests",
        href: "/guests",
        icon: Users,
        description: "Guest profiles, stay history and lifetime value",
      },
    ],
  },
  {
    label: "Distribution",
    items: [
      {
        title: "Channels",
        href: "/channels",
        icon: Plug,
        description: "Channex connectivity, mapping and sync journal",
        badgeKey: "syncErrors",
      },
      {
        title: "Inventory",
        href: "/inventory",
        icon: BedDouble,
        description: "Room types, rate plans and derived pricing",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: ChartNoAxesCombined,
        description: "Production, pace and channel profitability",
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Property profile, connectivity keys and webhooks",
      },
    ],
  },
];

export const allNavItems: NavItem[] = navigation.flatMap((s) => s.items);
