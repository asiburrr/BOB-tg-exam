"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { StatCard, Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/feedback/Toast";
import { AdminModal } from "@/components/admins/AdminModal";
import { api } from "@/lib/api";
import { AdminAccount, PermissionItem } from "@/lib/types";
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Calendar,
  Globe,
  UserX,
} from "lucide-react";

export default function AdminUsersPage() {
  const { admin: currentAdmin } = useAuth();
  const toast = useToast();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [adminsRes, permsRes]: any = await Promise.all([
        api.get("/admins?page=1&page_size=100"),
        api.get("/admins/permissions/all"),
      ]);

      if (adminsRes?.data) {
        setAdmins(adminsRes.data);
      }
      if (permsRes?.data) {
        setPermissionsList(permsRes.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load administrators");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const stats = useMemo(() => {
    const total = admins.length;
    const masterCount = admins.filter((a) => a.role === "Administration").length;
    const scopedCount = admins.filter((a) => a.role === "Admin").length;
    const activeCount = admins.filter((a) => a.status === "active").length;
    return {
      total,
      masterCount,
      scopedCount,
      activeCount,
    };
  }, [admins]);

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchSearch =
        !searchQuery.trim() ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole =
        roleFilter === "all" || a.role.toLowerCase() === roleFilter.toLowerCase();

      const matchStatus =
        statusFilter === "all" || a.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchRole && matchStatus;
    });
  }, [admins, searchQuery, roleFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (adm: AdminAccount) => {
    setEditingAdmin(adm);
    setModalOpen(true);
  };

  const handleToggleStatus = async (adm: AdminAccount) => {
    if (adm.id === currentAdmin?.id) {
      toast.error("Cannot suspend your own account.");
      return;
    }

    const nextStatus = adm.status === "active" ? "suspended" : "active";
    setActionLoadingId(adm.id);

    try {
      const res: any = await api.put(`/admins/${adm.id}`, {
        status: nextStatus,
      });

      if (res?.success) {
        toast.success(`Account ${nextStatus}.`);
        fetchAdmins(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const isAdministration = currentAdmin?.role === "Administration";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Administrators
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            variant="ghost"
            onClick={() => fetchAdmins(false)}
            aria-label="Refresh"
          />

          {isAdministration && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Administrator
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Admins"
          value={stats.total}
          icon={Users}
          variant="indigo"
        />
        <StatCard
          label="Master Admins"
          value={stats.masterCount}
          icon={ShieldAlert}
          variant="violet"
        />
        <StatCard
          label="Scoped Admins"
          value={stats.scopedCount}
          icon={KeyRound}
          variant="amber"
        />
        <StatCard
          label="Active Accounts"
          value={stats.activeCount}
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between pb-4 mb-4 border-b border-neutral-200/60 dark:border-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 shrink-0">
              <Filter className="w-3.5 h-3.5" />
            </div>

            <div className="w-36">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "administration", label: "Administration" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ]}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/40 dark:border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-48 h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-20 h-6 rounded-full" />
                  <Skeleton className="w-16 h-6 rounded-full" />
                  <Skeleton className="w-24 h-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50/50 dark:bg-white/5 rounded-2xl border border-neutral-200/50 dark:border-white/5">
            <UserX className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              No Administrators Found
            </h3>
            {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-3 px-3">Administrator</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Permissions</th>
                  <th className="py-3 px-3">Activity</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40 dark:divide-white/5 text-xs">
                {filteredAdmins.map((adm) => {
                  const initial = adm.name ? adm.name.charAt(0).toUpperCase() : "A";
                  const isCurrent = adm.id === currentAdmin?.id;
                  const isMaster = adm.role === "Administration";
                  const isSuspended = adm.status === "suspended";

                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-neutral-500/5 transition-colors group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              isMaster
                                ? "bg-purple-600 text-white dark:bg-purple-500"
                                : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span>{adm.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
                              {adm.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60">
                            <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            Administration
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                            <Shield className="w-3 h-3 text-neutral-500" />
                            Admin
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant={isSuspended ? "danger" : "success"}>
                          {isSuspended ? "Suspended" : "Active"}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        {isMaster ? (
                          <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Full Access
                          </div>
                        ) : adm.permissions && adm.permissions.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 text-[10px] font-medium">
                              {adm.permissions.length} module{adm.permissions.length > 1 ? "s" : ""}
                            </span>
                            {adm.permissions.slice(0, 2).map((permKey) => (
                              <span
                                key={permKey}
                                className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 text-[10px] font-mono"
                              >
                                {permKey}
                              </span>
                            ))}
                            {adm.permissions.length > 2 && (
                              <span className="text-[10px] text-neutral-400">
                                +{adm.permissions.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            None
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            <span>
                              {adm.last_login_at
                                ? new Date(adm.last_login_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Never"}
                            </span>
                          </div>
                          {adm.last_login_ip && (
                            <div className="flex items-center gap-1 text-neutral-500 font-mono text-[10px]">
                              <Globe className="w-2.5 h-2.5 text-neutral-400" />
                              <span>{adm.last_login_ip}</span>
                            </div>
                          )}
                          {adm.failed_login_attempts > 0 && (
                            <div className="flex items-center gap-1 text-rose-500 text-[10px]">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>{adm.failed_login_attempts} failed</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdministration && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(adm)}
                              disabled={actionLoadingId === adm.id}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isSuspended
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                              }`}
                            >
                              {isSuspended ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(adm)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchAdmins(true)}
        initialAdmin={editingAdmin}
        systemPermissions={permissionsList}
      />
    </div>
  );
}
