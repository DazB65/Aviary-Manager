import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsers() {
  const { data: users, isLoading, error } = trpc.admin.users.useQuery();

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

        <Card className="border border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">All Users</CardTitle>
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
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Plan</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Joined</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-3">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.plan === "pro" ? (
                            <Badge className="text-xs bg-yellow-400 text-yellow-900 hover:bg-yellow-400">Pro</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Free</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.role === "admin" ? (
                            <Badge className="text-xs bg-primary text-primary-foreground">Admin</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">User</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.lastSignedIn ? format(new Date(u.lastSignedIn), "dd MMM yyyy") : "Never"}
                        </td>
                      </tr>
                    ))}
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

