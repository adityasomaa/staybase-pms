import type { Metadata } from "next";
import { Building2, MailCheck, ShieldCheck, Users as UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { UsersManager, roleLabels, roleScopes } from "@/components/users/users-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserRole } from "@/lib/types";
import { listUsers, properties } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage(props: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const searchParams = await props.searchParams;
  const users = listUsers();

  const active = users.filter((u) => u.status === "active").length;
  const invited = users.filter((u) => u.status === "invited").length;
  const owners = users.filter((u) => u.role === "owner").length;
  const scoped = users.filter(
    (u) => u.role !== "owner" && u.propertyIds.length < properties.length,
  ).length;

  return (
    <>
      <PageHeader
        title="Users"
        description="A role decides what someone can do; the property assignment decides where. The two are independent, so a manager scoped to one property cannot see the others at all."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active users" value={String(active)} hint="can sign in now" icon={UsersIcon} />
        <StatCard
          label="Pending invites"
          value={String(invited)}
          hint={invited ? "waiting to be accepted" : "none outstanding"}
          icon={MailCheck}
        />
        <StatCard label="Owners" value={String(owners)} hint="full access to everything" icon={ShieldCheck} />
        <StatCard
          label="Property-scoped"
          value={String(scoped)}
          hint={`across ${properties.length} properties`}
          icon={Building2}
        />
      </div>

      <UsersManager
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          propertyIds: user.propertyIds,
          lastActiveAt: user.lastActiveAt,
        }))}
        properties={properties.map((p) => ({ id: p.id, title: p.title, code: p.code }))}
        openInviteOnMount={searchParams.invite === "1"}
      />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>What each role can reach</CardTitle>
          <CardDescription>
            Roles are deliberately coarse. Fine-grained permissions tend to drift out of date
            faster than the people they describe.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(roleLabels) as UserRole[]).map((role) => (
            <div key={role} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{roleLabels[role]}</p>
              <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                {roleScopes[role]}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
