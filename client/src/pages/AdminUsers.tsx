import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Trash2, MessageSquare, Cpu, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const utils = trpc.useUtils();
  const { data: users, isLoading, error } = trpc.admin.users.useQuery();
  const { data: chatStats, isFetching: chatFetching, refetch: refetchChat } = trpc.admin.chatStats.useQuery(undefined, { refetchInterval: 60 * 60 * 1000 });
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
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
      <div className="space-y-6 max-w-5xl mx-auto">
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
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Name</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Email</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Plan</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Role</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Joined</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Last Seen</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Chat Today</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Model</th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const chatEntry = chatStats?.topUsers.find(c => c.userId === u.id);
                      return (
                        <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{u.name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{u.email}</td>
                          <td className="px-3 py-2">
                            {u.plan === "pro" ? (
                              <Badge className="text-xs bg-yellow-400 text-yellow-900 hover:bg-yellow-400">Pro</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Free</Badge>
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
                                onClick={() => setPlan.mutate({ userId: u.id, plan: u.plan === "pro" ? "free" : "pro" })}
                              >
                                {u.plan === "pro" ? "→ Free" : "→ Pro"}
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

