import type { Metadata } from "next";
import { BedDouble, CircleAlert, Layers, Tags } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, mealPlanLabels } from "@/lib/format";
import {
  activeProperty,
  getRatePlan,
  getRevenueByRoomType,
  ratePlans,
  roomTypes,
  rooms,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  const propertyRoomTypes = roomTypes.filter((rt) => rt.propertyId === activeProperty.id);
  const performance = getRevenueByRoomType();
  const unmapped =
    propertyRoomTypes.filter((rt) => !rt.channexId).length +
    ratePlans.filter((rp) => !rp.channexId).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Room types, physical rooms and rate plans. Everything defined here is what Channex maps onto each channel's own product catalogue."
        actions={
          <>
            <Button variant="outline" size="sm">
              Add rate plan
            </Button>
            <Button size="sm">Add room type</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Room types"
          value={String(propertyRoomTypes.length)}
          hint={`${propertyRoomTypes.reduce((s, rt) => s + rt.count, 0)} sellable rooms`}
          icon={BedDouble}
        />
        <StatCard
          label="Rate plans"
          value={String(ratePlans.length)}
          hint={`${ratePlans.filter((rp) => rp.mode === "derived").length} derived from a parent`}
          icon={Tags}
        />
        <StatCard
          label="Physical rooms"
          value={String(rooms.length)}
          hint="assignable at the front desk"
          icon={Layers}
        />
        <StatCard
          label="Unmapped"
          value={String(unmapped)}
          hint={unmapped ? "skipped when pushing ARI" : "fully mapped to Channex"}
          icon={CircleAlert}
        />
      </div>

      <Tabs defaultValue="room-types">
        <TabsList>
          <TabsTrigger value="room-types">Room types</TabsTrigger>
          <TabsTrigger value="rate-plans">Rate plans</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="room-types" className="mt-4 space-y-3">
          {propertyRoomTypes.map((roomType) => {
            const plans = ratePlans.filter((rp) => rp.roomTypeId === roomType.id);
            const stats = performance.find((p) => p.code === roomType.code);
            return (
              <Card key={roomType.id} className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-base">{roomType.title}</CardTitle>
                  <CardDescription>
                    {roomType.count} rooms · sleeps {roomType.maxAdults} adults
                    {roomType.maxChildren ? ` + ${roomType.maxChildren} children` : ""} ·{" "}
                    base rate {formatMoney(roomType.defaultRate)}
                  </CardDescription>
                  <CardAction>
                    <Badge
                      variant="outline"
                      className={
                        roomType.channexId
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }
                    >
                      {roomType.channexId ? "Mapped" : "Unmapped"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  {stats ? (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Metric label="Room nights (90d)" value={String(stats.nights)} />
                      <Metric label="Revenue" value={formatMoney(stats.revenue)} />
                      <Metric label="ADR" value={formatMoney(stats.adr)} />
                      <Metric label="Occupancy" value={`${stats.occupancy}%`} />
                    </dl>
                  ) : null}
                  <Separator />
                  <ul className="space-y-1.5">
                    {plans.map((plan) => (
                      <li
                        key={plan.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="font-medium">{plan.title}</span>
                        <Badge variant="outline" className="tabular text-[10px]">
                          {plan.code}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {mealPlanLabels[plan.mealPlan]}
                        </span>
                        {plan.mode === "derived" ? (
                          <span className="text-muted-foreground text-xs">
                            · {plan.derivedOffsetPct}% of{" "}
                            {getRatePlan(plan.derivedFrom ?? "")?.code ?? "parent"}
                          </span>
                        ) : null}
                        {!plan.channexId ? (
                          <Badge
                            variant="outline"
                            className="ml-auto border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                          >
                            Unmapped
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="rate-plans" className="mt-4">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Rate plan</TableHead>
                      <TableHead>Room type</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead className="hidden md:table-cell">Board</TableHead>
                      <TableHead className="hidden lg:table-cell">Cancellation</TableHead>
                      <TableHead className="pr-6 text-right">Channex</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratePlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="pl-6">
                          <p className="text-sm font-medium">{plan.title}</p>
                          <p className="text-muted-foreground tabular text-xs">{plan.code}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {roomTypes.find((rt) => rt.id === plan.roomTypeId)?.title ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {plan.mode === "derived" ? (
                            <span>
                              Derived {plan.derivedOffsetPct}%
                              <span className="text-muted-foreground">
                                {" "}
                                from {getRatePlan(plan.derivedFrom ?? "")?.code ?? "parent"}
                              </span>
                            </span>
                          ) : (
                            "Manual"
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {mealPlanLabels[plan.mealPlan]}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden max-w-64 truncate text-xs lg:table-cell">
                          {plan.cancellationPolicy}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Badge
                            variant="outline"
                            className={
                              plan.channexId
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }
                          >
                            {plan.channexId ? "Mapped" : "Unmapped"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Room</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Room type</TableHead>
                      <TableHead className="hidden sm:table-cell">Housekeeping</TableHead>
                      <TableHead className="pr-6">Attendant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.slice(0, 40).map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="tabular pl-6 text-sm font-medium">
                          {room.number}
                        </TableCell>
                        <TableCell className="tabular text-sm">{room.floor}</TableCell>
                        <TableCell className="text-sm">
                          {roomTypes.find((rt) => rt.id === room.roomTypeId)?.title ?? "—"}
                        </TableCell>
                        <TableCell className="hidden text-sm capitalize sm:table-cell">
                          {room.housekeeping.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-muted-foreground pr-6 text-sm">
                          {room.assignedTo ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="tabular text-sm font-medium">{value}</dd>
    </div>
  );
}
