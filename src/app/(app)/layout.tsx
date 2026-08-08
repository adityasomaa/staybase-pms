import { AppSidebar } from "@/components/app-sidebar";
import { OnboardingTour } from "@/components/onboarding-tour";
import { SiteHeader } from "@/components/site-header";
import { SuspendedWorkspace } from "@/components/billing/suspended-workspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  activeProperty,
  arrivalsOn,
  getBillingOverview,
  getHousekeepingBoard,
  listRoomBlocks,
  properties,
  syncEvents,
  TODAY,
} from "@/lib/data/queries";
import { getBillingState, hasSeenTour } from "@/lib/workspace";

/**
 * A PMS is a live operational view — "today" has to be resolved per request,
 * not frozen into the build. Every route under this group renders on demand.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [billingState, seenTour] = await Promise.all([getBillingState(), hasSeenTour()]);
  const billing = getBillingOverview();

  const badges = {
    arrivals: arrivalsOn().length,
    syncErrors: syncEvents.filter((e) => e.outcome === "error").length,
    dirtyRooms: getHousekeepingBoard().filter((r) => r.housekeeping === "dirty").length,
    blocks: listRoomBlocks().filter((b) => b.to > TODAY).length,
    unpaidInvoices: billing.outstanding.length,
  };

  if (billingState === "suspended") {
    return (
      <SuspendedWorkspace
        amountDue={billing.amountDue}
        invoiceNumber={billing.outstanding[0]?.number ?? billing.invoices[0]?.number ?? "—"}
        planName={billing.plan.name}
      />
    );
  }

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
      {/* SidebarInset already renders a <main>; nesting another would create a
          second landmark, so the page wrapper below is a plain element. */}
      <SidebarInset className="min-w-0 overflow-x-clip">
        <SiteHeader
          propertyName={`${activeProperty.title} · ${activeProperty.city}`}
          pastDue={billing.outstanding.length > 0}
          daysUntilSuspension={billing.daysUntilSuspension}
        />
        <div className="flex flex-1 flex-col gap-5 p-4 lg:p-6">{children}</div>
      </SidebarInset>
      {seenTour ? null : <OnboardingTour />}
    </SidebarProvider>
  );
}
