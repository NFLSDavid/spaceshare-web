"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useModeStore } from "@/stores/mode-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { signOut } from "next-auth/react";
import {
  User as UserIcon, Mail, Phone, Shield, Camera, Upload,
  ArrowLeftRight, LogOut, Heart, Settings,
} from "lucide-react";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  isVerified: number;
  governmentId: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { isHostMode, toggleMode } = useModeStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) fetchProfile();
  }, [user?.id]);

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/users?id=${user!.id}`);
      const data = await res.json();
      setProfile(data);
      setEditForm({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
      });
    } catch {
      toast("Failed to load profile", "error");
    }
    setLoading(false);
  }

  async function updateProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast("Profile updated", "success");
        setEditDialog(false);
        fetchProfile();
      }
    } catch {
      toast("Failed to update", "error");
    }
    setSaving(false);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "spaceshare/profiles");

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      toast("Photo updated", "success");
      fetchProfile();
    } catch {
      toast("Failed to upload photo", "error");
    }
  }

  async function uploadGovernmentId(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "spaceshare/ids");

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governmentId: url }),
      });
      toast("Government ID submitted for verification", "success");
      fetchProfile();
    } catch {
      toast("Failed to upload", "error");
    }
  }

  const verificationStatus = profile?.isVerified === 1
    ? { label: "Verified", variant: "success" as const }
    : profile?.isVerified === -1
    ? { label: "Denied", variant: "error" as const }
    : profile?.governmentId
    ? { label: "Pending Review", variant: "warning" as const }
    : { label: "Not Verified", variant: "default" as const };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1 rounded-full bg-blue-600 text-white cursor-pointer">
                <Camera className="h-3 w-3" />
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <Badge variant={verificationStatus.variant} className="mt-1">
                <Shield className="h-3 w-3 mr-1" />
                {verificationStatus.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Personal Information</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditDialog(true)}>Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span>{profile?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span>{profile?.phone || "Not set"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Verification */}
      {profile?.isVerified !== 1 && (
        <Card>
          <CardHeader><h3 className="font-semibold">Identity Verification</h3></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Upload your government ID to become a verified user and host listings.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Upload Government ID</span>
              <input type="file" accept="image/*" className="hidden" onChange={uploadGovernmentId} />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={toggleMode}>
          <ArrowLeftRight className="h-4 w-4 mr-3" />
          Switch to {isHostMode ? "Client" : "Host"} Mode
        </Button>
        <Link href="/shortlist">
          <Button variant="outline" className="w-full justify-start">
            <Heart className="h-4 w-4 mr-3" />
            My Shortlist
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
          <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
          <Input label="Phone Number" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Button className="w-full" onClick={updateProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
