import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Trash2, MessageSquare, Cpu, AlertTriangle, Activity, RefreshCw, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, useState } from "react";

type SortKey = "name" | "email" | "plan" | "role" | "joined" | "lastSeen" | "chatToday" | "model";
type SortDirection = "asc" | "desc";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "joined",
    direction: "desc",
  });
  const utils = trpc.useUtils();
  const { data: users, isLoading, error } = trpc.admin.users.useQuery();
  const { data: chatStats, isFetching: chatFetching, refetch: refetchChat } = trpc.admin.chatStats.useQuery(undefined, { refetchInterval: 60 * 60 * 1000 });
  const { data: aiUsage, isFetching: aiUsageFetching, refetch: refetchAIUsage } = trpc.admin.aiUsage.useQuery(undefined, { refetchInterval: 60 * 60 * 1000 });
  const setPlan = trpc.admin.setPlan.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); toast.success("Plan updated!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); toast.success("User deleted."); },
    onError: (e) => toast.error(e.message),
  });
  const setRole = trpc.admin.setRole.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); toast.success("Role updated!"); },
    onError: (e) => toast.error(e.message),
  });

  function handleDelete(userId: number, email: string) {
    if (!confirm(`Delete user "${email}" and all their data? This cannot be undone.`)) return;
    deleteUser.mutate({ userId });
  }

  const sortedUsers = useMemo(() => {
    const chatByUserId = new Map(chatStats?.topUsers.map(entry => [entry.userId, entry]) ?? []);
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    const planRank: Record<string, number> = { free: 0, starter: 1, pro: 2 };

    function compareText(a: string | null | undefined, b: string | null | undefined) {
      return (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });
    }

    function compareNumber(a: number, b: number) {
      return a === b ? 0 : a > b ? 1 : -1;
    }

    return [...(users ?? [])].sort((a, b) => {
      let result = 0;
      const aChat = chatByUserId.get(a.id);
      const bChat = chatByUserId.get(b.id);

      switch (sortConfig.key) {
        case "name":
          result = compareText(a.name, b.name);
          break;
        case "email":
          result = compareText(a.email, b.email);
          break;
        case "plan":
          result = compareNumber(planRank[a.plan] ?? -1, planRank[b.plan] ?? -1);
          break;
        case "role":
          result = compareText(a.role, b.role);
          break;
        case "joined":
          result = compareNumber(new Date(a.createdAt || 0).getTime(), new Date(b.createdAt || 0).getTime());
          break;
        case "lastSeen":
          result = compareNumber(new Date(a.lastSignedIn || 0).getTime(), new Date(b.lastSignedIn || 0).getTime());
          break;
        case "chatToday":
          result = compareNumber(aChat?.count ?? 0, bChat?.count ?? 0);
          break;
        case "model":
          result = compareText(aChat ? chatStats?.model : "", bChat ? chatStats?.model : "");
          break;
      }

      return result === 0 ? compareNumber(a.id, b.id) : result * direction;
    });
  }, [chatStats, sortConfig, users]);

  function sortBy(key: SortKey) {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  const toolFailures = Number(aiUsage?.totals.find(row => row.eventType === "tool" && row.status === "failure")?.count ?? 0);
  const toolSuccesses = Number(aiUsage?.totals.find(row => row.eventType === "tool" && row.status === "success")?.count ?? 0);
  const approvals = Number(aiUsage?.approvals?.approved ?? 0);
  const rejections = Number(aiUsage?.approvals?.rejected ?? 0);

  function sortHeader(key: SortKey, label: string) {
    const active = sortConfig.key === key;
    const Icon = active ? (sortConfig.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-sm text-left font-medium text-muted-foreground hover:text-foreground"
        onClick={() => sortBy(key)}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16 text-destructive">
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            Admin: Users
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading..." : `${users?.length ?? 0} registered user${(users?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* AI Chat Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Cpu className="h-5 w-5 text-teal-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">AI Model</p>
                <p className="text-sm font-semibold">{chatStats?.model ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Messages Today</p>
                <p className="text-sm font-semibold">{chatStats?.totalMessagesToday ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Active Chat Users</p>
                <p className="text-sm font-semibold">{chatStats?.activeUsersToday ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${(chatStats?.rateLimitedUsers ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Rate Limited</p>
                <p className="text-sm font-semibold">{chatStats?.rateLimitedUsers ?? 0} users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">AI Copilot Usage</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5"
              onClick={() => refetchAIUsage()}
              disabled={aiUsageFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${aiUsageFetching ? "animate-spin" : ""}`} />
              {aiUsageFetching ? "Refreshing..." : "Refresh AI Usage"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Tool Successes</p>
                <p className="text-2xl font-semibold">{toolSuccesses}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Tool Failures</p>
                <p className={`text-2xl font-semibold ${toolFailures > 0 ? "text-orange-600" : ""}`}>{toolFailures}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Approvals</p>
                <p className="text-2xl font-semibold">{approvals}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Rejections</p>
                <p className="text-2xl font-semibold">{rejections}</p>
              </div>
            </div>

            {aiUsage?.failedTools?.length ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Failed tools</p>
                <div className="flex flex-wrap gap-2">
                  {aiUsage.failedTools.map((tool) => (
                    <Badge key={tool.toolName ?? "unknown"} variant="outline" className="text-xs">
                      {tool.toolName ?? "unknown"}: {Number(tool.count)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">No failed AI tools recorded in the last {aiUsage?.days ?? 7} days.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">All Users</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5"
              onClick={() => refetchChat()}
              disabled={chatFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${chatFetching ? "animate-spin" : ""}`} />
              {chatFetching ? "Refreshing…" : "Refresh Chat Stats"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Loading...</div>
            ) : !users?.length ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("name", "Name")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("email", "Email")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("plan", "Plan")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("role", "Role")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("joined", "Joined")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("lastSeen", "Last Seen")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("chatToday", "Chat Today")}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{sortHeader("model", "Model")}</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(u => {
                      const chatEntry = chatStats?.topUsers.find(c => c.userId === u.id);
                      return (
                        <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{u.name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{u.email}</td>
                          <td className="px-3 py-2">
                            {u.plan === "pro" ? (
                              <Badge className="text-xs bg-yellow-400 text-yellow-900 hover:bg-yellow-400">Pro</Badge>
                            ) : u.plan === "starter" ? (
                              <Badge className="text-xs bg-teal-100 text-teal-800 border-teal-200">Starter</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Trial/Expired</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {u.role === "admin" ? (
                              <Badge className="text-xs bg-primary text-primary-foreground">Admin</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">User</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {u.createdAt ? format(new Date(u.createdAt), "d MMM yy") : "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {u.lastSignedIn ? format(new Date(u.lastSignedIn), "d MMM yy") : "Never"}
                          </td>
                          <td className="px-3 py-2">
                            {chatEntry ? (
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-medium">{chatEntry.count}</span>
                                <span className="text-muted-foreground">/ {chatStats?.maxPerDay}</span>
                                {chatEntry.remaining === 0 && (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 ml-1">Maxed</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                            {chatEntry ? chatStats?.model : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 whitespace-nowrap"
                                disabled={setPlan.isPending || deleteUser.isPending || setRole.isPending}
                                onClick={() => setPlan.mutate({ userId: u.id, plan: u.plan === "pro" ? "starter" : "pro" })}
                              >
                                {u.plan === "pro" ? "→ Starter" : "→ Pro"}
                              </Button>
                              {u.id !== me?.id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`text-xs h-7 whitespace-nowrap ${u.role === "admin" ? "border-primary/40 text-primary hover:bg-primary/10" : ""}`}
                                    disabled={setRole.isPending || deleteUser.isPending}
                                    onClick={() => setRole.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                                  >
                                    {u.role === "admin" ? "→ User" : "→ Admin"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={deleteUser.isPending}
                                    onClick={() => handleDelete(u.id, u.email ?? "")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
