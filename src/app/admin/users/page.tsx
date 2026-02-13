"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { CheckCircle, XCircle, Eye, Shield } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: number;
  governmentId: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast("Failed to load users", "error");
    }
    setLoading(false);
  }

  async function updateVerification(userId: string, status: number) {
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, isVerified: status }),
      });
      toast(status === 1 ? "User verified" : "Verification denied", "success");
      setSelected(null);
      fetchUsers();
    } catch {
      toast("Failed to update", "error");
    }
  }

  const filtered = filter === "pending"
    ? users.filter((u) => u.governmentId && u.isVerified === 0)
    : users;

  const verifyLabel = (v: number) =>
    v === 1 ? "Verified" : v === -1 ? "Denied" : "Unverified";

  const verifyVariant = (v: number): "success" | "error" | "default" =>
    v === 1 ? "success" : v === -1 ? "error" : "default";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({users.filter((u) => u.governmentId && u.isVerified === 0).length})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Users
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {filter === "pending" ? "No pending verifications" : "No users found"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(u)}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.governmentId && <Shield className="h-4 w-4 text-blue-500" />}
                  <Badge variant={verifyVariant(u.isVerified)}>{verifyLabel(u.isVerified)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} title="User Details">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><strong>Name:</strong> {selected.firstName} {selected.lastName}</p>
              <p><strong>Email:</strong> {selected.email}</p>
              <p><strong>Status:</strong> <Badge variant={verifyVariant(selected.isVerified)}>{verifyLabel(selected.isVerified)}</Badge></p>
            </div>

            {selected.governmentId && (
              <div>
                <p className="text-sm font-medium mb-2">Government ID:</p>
                <img src={selected.governmentId} alt="Government ID" className="rounded-lg border max-h-60 object-contain" />
              </div>
            )}

            {selected.governmentId && selected.isVerified === 0 && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => updateVerification(selected.id, 1)}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => updateVerification(selected.id, -1)}>
                  <XCircle className="h-4 w-4 mr-1" /> Deny
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
