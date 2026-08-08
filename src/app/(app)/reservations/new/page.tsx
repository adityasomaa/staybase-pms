import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { NewBookingForm, type BookingOption } from "@/components/reservations/new-booking-form";
import { Button } from "@/components/ui/button";
import {
  TODAY,
  activeProperty,
  getAriGrid,
  ratePlans,
  roomTypes,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "New booking" };

export default function NewReservationPage() {
  // Seed the quote with the live rate for today so the form opens on a real price.
  const { rows } = getAriGrid(TODAY, 1);

  const options: BookingOption[] = roomTypes
    .filter((rt) => rt.propertyId === activeProperty.id)
    .map((rt) => {
      const row = rows.find((r) => r.roomTypeId === rt.id);
      return {
        roomTypeId: rt.id,
        roomTypeTitle: rt.title,
        count: rt.count,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        plans: ratePlans
          .filter((rp) => rp.roomTypeId === rt.id)
          .map((rp) => ({
            ratePlanId: rp.id,
            title: rp.title,
            code: rp.code,
            mealPlan: rp.mealPlan,
            rate:
              row?.plans.find((p) => p.ratePlanId === rp.id)?.cells[0]?.rate ?? rt.defaultRate,
          })),
      };
    });

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link href="/reservations">
            <ArrowLeft className="size-3.5" />
            All reservations
          </Link>
        </Button>
        <PageHeader
          title="New booking"
          description="Create a direct or walk-in reservation. Availability is decremented locally and pushed to Channex on save so channels never oversell."
        />
      </div>

      <NewBookingForm options={options} today={TODAY} />
    </>
  );
}
