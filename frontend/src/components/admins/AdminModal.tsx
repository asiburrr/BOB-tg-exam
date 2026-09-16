"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/feedback/Toast";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { AdminAccount, PermissionItem } from "@/lib/types";
import {
  Shield,
  ShieldCheck,
  User,
  Mail,
  Lock,
  CheckCheck,
  XSquare,
} from "lucide-react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAdmin?: AdminAccount | null;
  systemPermissions?: PermissionItem[];
}

export function AdminModal({
  isOpen,
  onClose,
  onSuccess,
  initialAdmin = null,
  systemPermissions = [],
}: AdminModalProps) {
  const { admin: currentAdmin } = useAuth();
  const toast = useToast();
  const isEditing = Boolean(initialAdmin);
  const isSelf = Boolean(initialAdmin && currentAdmin && initialAdmin.id === currentAdmin.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Admin");
  const [status, setStatus] = useState("active");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialAdmin) {
        setName(initialAdmin.name || "");
        setEmail(initialAdmin.email || "");
        setRole(initialAdmin.role || "Admin");
        setStatus(initialAdmin.status || "active");
        setPassword("");
        setSelectedPermissions(initialAdmin.permissions || []);
      } else {
        setName("");
        setEmail("");
        setRole("Admin");
        setStatus("active");
        setPassword("");
        setSelectedPermissions(["dashboard:view", "question:view"]);
      }
      setError(null);
    }
  }, [isOpen, initialAdmin]);

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissions(systemPermissions.map((p) => p.key));
  };

  const handleDeselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required.");
      return;
    }
    if (!isEditing && (!password || password.length < 8)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (isEditing && password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isEditing && initialAdmin) {
        const updatePayload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          permissions: role === "Administration" ? [] : selectedPermissions,
        };
        if (!isSelf) {
          updatePayload.role = role;
          updatePayload.status = status;
        }
        if (password) {
          updatePayload.password = password;
        }

        const res: any = await api.put(`/admins/${initialAdmin.id}`, updatePayload);
        if (res?.success) {
          toast.success("Saved successfully.");
          onSuccess();
          onClose();
        }
      } else {
        const createPayload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          status,
          password,
          permissions: role === "Administration" ? [] : selectedPermissions,
        };

        const res: any = await api.post("/admins", createPayload);
        if (res?.success) {
          toast.success("Administrator created.");
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      const msg = err?.message || "An error occurred.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (isSelf ? "Edit Profile" : "Edit Administrator") : "New Administrator"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <Alert variant="danger" className="mb-2">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Name"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            leftIcon={<User className="w-4 h-4 text-neutral-400" />}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leftIcon={<Mail className="w-4 h-4 text-neutral-400" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Role"
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: "Administration", label: "Administration" },
              { value: "Admin", label: "Admin" },
            ]}
          />

          <Select
            label="Status"
            value={status}
            disabled={isSelf}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        </div>

        <Input
          label={isEditing ? "Password" : "Password"}
          type="password"
          placeholder={isEditing ? "Leave blank to keep current password" : "Min 8 characters"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEditing}
          leftIcon={<Lock className="w-4 h-4 text-neutral-400" />}
        />

        <div className="pt-2 border-t border-neutral-200/60 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
              Permissions
            </span>

            {role === "Admin" && systemPermissions.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  All
                </button>
                <span className="text-neutral-300 dark:text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1"
                >
                  <XSquare className="w-3 h-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {role === "Administration" ? (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 py-1.5">
              Administration role has full access to all system modules.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {systemPermissions.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    onClick={() => handleTogglePermission(perm.key)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                      isChecked
                        ? "bg-blue-500/10 border-blue-500/30 text-neutral-900 dark:text-white"
                        : "bg-neutral-50/50 dark:bg-white/5 border-neutral-200/60 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{perm.name}</div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {perm.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200/50 dark:border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={isEditing ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          >
            {isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
