"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/feedback/Toast";
import {
  User,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  Edit2,
  Save,
  Check,
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const { admin, updateProfile, changePassword } = useAuth();
  const toast = useToast();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      setName(admin.name);
      setEmail(admin.email);
    }
  }, [admin]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim() || !email.trim()) {
      setProfileError("Both name and email are required.");
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile(name.trim(), email.trim());
      setProfileSuccess("Profile updated successfully.");
      toast.success("Profile updated successfully.", "Saved");
      setIsEditingProfile(false);
    } catch (err: any) {
      const msg = err?.message || "Failed to update profile";
      setProfileError(msg);
      toast.error(msg, "Update Failed");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelProfileEdit = () => {
    if (admin) {
      setName(admin.name);
      setEmail(admin.email);
    }
    setProfileError(null);
    setIsEditingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully.");
      toast.success("Password changed successfully.", "Security Updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err?.message || "Failed to update password";
      setPasswordError(msg);
      toast.error(msg, "Password Error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const initial = admin?.name ? admin.name.charAt(0).toUpperCase() : "A";
  const isAdministration = admin?.role === "Administration";

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="p-4 sm:p-8 rounded-3xl glass-panel relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-extrabold text-xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg">
            {initial}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                {admin?.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {admin?.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-mono truncate">
              {admin?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200/50 dark:border-white/10 pb-3 gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-500" />
                <span>Profile Information</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage your personal information and contact email.
              </p>
            </div>
            {!isEditingProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="self-start sm:self-auto inline-flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>

          {profileError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4 pt-1 text-xs">
              <Input
                label="Full Name"
                type="text"
                required
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email Address"
                type="email"
                required
                placeholder="admin@bobexam.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                <Button type="submit" size="sm" loading={profileLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelProfileEdit}
                  disabled={profileLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-xs sm:text-sm space-y-3 text-neutral-600 dark:text-neutral-400 divide-y divide-neutral-200/30 dark:divide-white/5">
              <div className="flex flex-col sm:flex-row sm:justify-between py-1.5 gap-1">
                <span className="text-neutral-500">Full Name</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 break-words">{admin?.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1.5 gap-1">
                <span className="text-neutral-500">Email Address</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100 break-all">{admin?.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1.5 gap-1">
                <span className="text-neutral-500">System Role</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{admin?.role}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-1.5 gap-1">
                <span className="text-neutral-500">Administrator ID</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">#{admin?.id}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
          <div className="border-b border-neutral-200/50 dark:border-white/10 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-neutral-500" />
              <span>Change Password</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Update your account credentials to keep your access secure.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="max-w-md w-full space-y-4 pt-1 text-xs">
            {passwordError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              label="New Password"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              label="Confirm New Password"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="pt-2">
              <Button type="submit" size="sm" loading={passwordLoading} className="w-full sm:w-auto">
                Update Password
              </Button>
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200/50 dark:border-white/10 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-neutral-500" />
              <span>Assigned Permissions</span>
            </h2>
            {isAdministration ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <Shield className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <div>
            {isAdministration ? (
              <div className="p-4 rounded-2xl bg-neutral-500/5 dark:bg-white/5 border border-neutral-200/40 dark:border-white/5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                As an <strong>Administration</strong> user, you have unrestricted master privileges across all modules, settings, exams, and administrator roles.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">
                  You have access to the following capabilities granted by Administration:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {admin?.permissions && admin.permissions.length > 0 ? (
                    admin.permissions.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 text-xs font-mono border border-neutral-200/50 dark:border-white/10"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400 italic">No granular permissions assigned yet.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
