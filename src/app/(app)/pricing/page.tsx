import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PricingWorkbench } from "@/components/pricing/pricing-workbench";
import { Button } from "@/components/ui/button";
import {
  TODAY,
  activeProperty,
  getPricingInputs,
  pricingGuardrails,
  pricingRules,
  roomTypes,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Dynamic Pricing" };

export default function PricingPage() {
  const { inputs } = getPricingInputs(30);

  return (
    <>
      <PageHeader
        title="Dynamic Pricing"
        description="Rules compound in priority order against the running rate, then per-room-type guardrails clamp the result. Nothing publishes on its own — suggestions stage on the calendar and you still push deliberately."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/help/dynamic-pricing-rules">How this works</Link>
          </Button>
        }
      />

      <PricingWorkbench
        inputs={inputs}
        initialRules={pricingRules}
        initialGuardrails={pricingGuardrails}
        roomTypes={roomTypes
          .filter((rt) => rt.propertyId === activeProperty.id)
          .map((rt) => ({ id: rt.id, title: rt.title }))}
        today={TODAY}
      />
    </>
  );
}
