"use client";

import * as React from "react";
import { Building2, MoreHorizontal, Search, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { relativeTime } from "@/lib/date";
import { initials } from "@/lib/format";
import type { UserRole, UserStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  propertyIds: string[];
  lastActiveAt: string | null;
}

export interface PropertyOption {
  id: string;
  title: string;
  code: string;
}

export const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  revenue_manager: "Revenue manager",
  front_desk: "Front desk",
  housekeeping: "Housekeeping",
  accountant: "Accountant",
};

export const roleScopes: Record<UserRole, string> = {
  owner: "Everything, including billing and user management. Always sees every property.",
  manager: "Operations, rates and reporting for assigned properties. No billing.",
  revenue_manager: "Rates, availability and dynamic pricing. No front desk or billing.",
  front_desk: "Arrivals, departures, folios and the booking calendar.",
  housekeeping: "The room status board only.",
  accountant: "Billing, invoices and reports. No operational screens.",
};

const statusTone: Record<UserStatus, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "text-muted-foreground",
};

/**
 * User directory.
 *
 * Role and property assignment are two independent dimensions: the role says
 * what someone may do, the assignment says where. Owners are excluded from
 * scoping because an owner who cannot see a property cannot be billed for it.
 */
export function UsersManager({
  users,
  properties,
  openInviteOnMount = false,
}: {
  users: UserRow[];
  properties: PropertyOption[];
  openInviteOnMount?: boolean;
}) {
  const [rows, setRows] = React.useState(users);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "all">("all");
  const [inviteOpen, setInviteOpen] = React.useState(openInviteOnMount);
  const [inviteSeq, setInviteSeq] = React.useState(0);
  const [scoping, setScoping] = React.useState<UserRow | null>(null);

  const openInvite = () => {
    setInviteSeq((value) => value + 1);
    setInviteOpen(true);
  };

  const filtered = rows.filter((user) => {
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      roleLabels[user.role].toLowerCase().includes(q)
    );
  });

  const propertyLabel = (user: UserRow) => {
    if (user.role === "owner") return "All properties";
    if (user.propertyIds.length === 0) return "No access";
    if (user.propertyIds.length === properties.length) return "All properties";
    return user.propertyIds
      .map((id) => properties.find((p) => p.id === id)?.code ?? id)
      .join(", ");
  };

  const setStatus = (id: string, status: UserStatus) => {
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    const user = rows.find((u) => u.id === id);
    toast.success(
      status === "suspended" ? `${user?.name} suspended` : `${user?.name} reactivated`,
      {
        description:
          status === "suspended"
            ? "They keep their profile but cannot sign in."
            : "They can sign in again with the same role and properties.",
      },
    );
  };

  const saveScope = (id: string, propertyIds: string[]) => {
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, propertyIds } : u)));
    setScoping(null);
    toast.success("Property access updated", {
      description: `${propertyIds.length} propert${propertyIds.length === 1 ? "y" : "ies"} assigned.`,
    });
  };

  const invite = (draft: { name: string; email: string; role: UserRole; propertyIds: string[] }) => {
    const user: UserRow = {
      id: `usr_local_${Date.now()}`,
      name: draft.name || draft.email.split("@")[0],
      email: draft.email,
      role: draft.role,
      status: "invited",
      propertyIds: draft.role === "owner" ? properties.map((p) => p.id) : draft.propertyIds,
      lastActiveAt: null,
    };
    setRows((prev) => [user, ...prev]);
    setInviteOpen(false);
    toast.success(`Invitation sent to ${draft.email}`, {
      description: `${roleLabels[draft.role]} · ${user.propertyIds.length} propert${user.propertyIds.length === 1 ? "y" : "ies"}.`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or role…"
            className="h-9 pl-8"
            aria-label="Search users"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {(Object.keys(roleLabels) as UserRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={openInvite}>
          <UserPlus className="size-3.5" />
          Invite user
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              title="No users match"
              description="Try a different search term or clear the role filter."
              icon={<Search className="size-6" />}
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Properties</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Last active</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-[10px]">
                              {initials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {user.role === "owner" ? (
                            <ShieldCheck className="text-primary size-3.5 shrink-0" />
                          ) : null}
                          <span className="text-sm">{roleLabels[user.role]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                          <Building2 className="size-3.5 shrink-0" />
                          {propertyLabel(user)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("capitalize", statusTone[user.status])}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                        {user.lastActiveAt ? relativeTime(user.lastActiveAt) : "Never"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-label={`Actions for ${user.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              disabled={user.role === "owner"}
                              onSelect={() => setScoping(user)}
                            >
                              Assign properties
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                toast.info("Invitation resent", { description: user.email })
                              }
                              disabled={user.status !== "invited"}
                            >
                              Resend invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === "suspended" ? (
                              <DropdownMenuItem onSelect={() => setStatus(user.id, "active")}>
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={user.role === "owner"}
                                onSelect={() => setStatus(user.id, "suspended")}
                              >
                                Suspend access
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Both dialogs are keyed so they remount with fresh state instead of
          syncing every field back in an effect. */}
      <InviteDialog
        key={`invite-${inviteSeq}`}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        properties={properties}
        onInvite={invite}
      />
      <ScopeDialog
        key={`scope-${scoping?.id ?? "none"}`}
        user={scoping}
        properties={properties}
        onCancel={() => setScoping(null)}
        onSave={saveScope}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  properties,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: PropertyOption[];
  onInvite: (draft: { name: string; email: string; role: UserRole; propertyIds: string[] }) => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("front_desk");
  const [selected, setSelected] = React.useState<string[]>([]);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const ownerScope = role === "owner";
  const invalid = !emailValid || (!ownerScope && selected.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription className="text-pretty">
            They receive an email invitation. Nothing is created until they accept, so a
            pending invite can be revoked with no side effects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hotel.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name (optional)</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ayu Pratiwi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleLabels) as UserRole[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {roleLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs text-pretty">{roleScopes[role]}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Properties</Label>
            {ownerScope ? (
              <p className="text-muted-foreground text-xs text-pretty">
                Owners always have access to every property, so there is nothing to scope.
              </p>
            ) : (
              <div className="space-y-2">
                {properties.map((property) => (
                  <label
                    key={property.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 text-sm"
                  >
                    <Checkbox
                      checked={selected.includes(property.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked ? [...prev, property.id] : prev.filter((id) => id !== property.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{property.title}</span>
                      <span className="text-muted-foreground tabular text-xs">
                        {property.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => onInvite({ name, email, role, propertyIds: selected })}
          >
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeDialog({
  user,
  properties,
  onCancel,
  onSave,
}: {
  user: UserRow | null;
  properties: PropertyOption[];
  onCancel: () => void;
  onSave: (id: string, propertyIds: string[]) => void;
}) {
  const [selected, setSelected] = React.useState<string[]>(user?.propertyIds ?? []);

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign properties</DialogTitle>
          <DialogDescription className="text-pretty">
            {user?.name} is a {user ? roleLabels[user.role].toLowerCase() : "user"}. They will
            only see the properties ticked here — everything else is invisible to them, not
            merely read-only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {properties.map((property) => (
            <label
              key={property.id}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 text-sm"
            >
              <Checkbox
                checked={selected.includes(property.id)}
                onCheckedChange={(checked) =>
                  setSelected((prev) =>
                    checked ? [...prev, property.id] : prev.filter((id) => id !== property.id),
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{property.title}</span>
                <span className="text-muted-foreground tabular text-xs">{property.code}</span>
              </span>
            </label>
          ))}
          {selected.length === 0 ? (
            <p className="text-destructive text-xs">
              With no properties assigned they can sign in but will see an empty workspace.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => user && onSave(user.id, selected)}>Save access</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
