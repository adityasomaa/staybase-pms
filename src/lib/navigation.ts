import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  BrushCleaning,
  CalendarRange,
  ChartNoAxesCombined,
  CircleHelp,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  Plug,
  Settings,
  SlidersHorizontal,
  SquareStack,
  Table2,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badgeKey?: "arrivals" | "syncErrors" | "dirtyRooms" | "blocks" | "unpaidInvoices";
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
        icon: Table2,
        description: "Edit the ARI grid and push it to every channel",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Booking Calendar",
        href: "/planner",
        icon: CalendarRange,
        description: "Room-by-room timeline, stay details and maintenance blocks",
        badgeKey: "blocks",
      },
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
        description: "Room types, rooms, rate plans and derived pricing",
      },
      {
        title: "Dynamic Pricing",
        href: "/pricing",
        icon: SlidersHorizontal,
        description: "Rules, guardrails and suggested rates for the next 30 days",
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
    label: "Workspace",
    items: [
      {
        title: "Users",
        href: "/users",
        icon: UserCog,
        description: "Invite teammates, set roles and assign properties",
      },
      {
        title: "Billing",
        href: "/billing",
        icon: CreditCard,
        description: "Subscription, invoices and payment method",
        badgeKey: "unpaidInvoices",
      },
      {
        title: "Help & Tutorials",
        href: "/help",
        icon: CircleHelp,
        description: "Guides for rates, channels, pricing, billing and access",
      },
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
