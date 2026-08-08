import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  activeProperty,
  arrivalsOn,
  getHousekeepingBoard,
  properties,
  syncEvents,
} from "@/lib/data/queries";

/**
 * A PMS is a live operational view — "today" has to be resolved per request,
 * not frozen into the build. Every route under this group renders on demand.
 */
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const badges = {
    arrivals: arrivalsOn().length,
    syncErrors: syncEvents.filter((e) => e.outcome === "error").length,
    dirtyRooms: getHousekeepingBoard().filter((r) => r.housekeeping === "dirty").length,
  };

  return (
    <SidebarProvider>
      <AppSidebar
        properties={properties.map((p) => ({
          id: p.id,
          title: p.title,
          code: p.code,
          city: p.city,
          rooms: p.rooms,
          connected: p.channexId !== null,
        }))}
        activePropertyId={activeProperty.id}
        badges={badges}
      />
      <SidebarInset className="min-w-0 overflow-hidden">
        <SiteHeader propertyName={`${activeProperty.title} · ${activeProperty.city}`} />
        <main className="flex flex-1 flex-col gap-5 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
