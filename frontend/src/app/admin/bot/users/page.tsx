"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    ShieldCheck,
    ShieldAlert,
    ClipboardList,
    Send,
    Search,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting, TelegramUser } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { OnboardingFilterBar } from "@/components/bot/OnboardingFilterBar";
import { parseOnboardingConfig, resolveOnboardingLabel } from "@/lib/onboarding";

export default function BotCandidatesPage() {
    const router = useRouter();
    const toast = useToast();

    const [settings, setSettings] = useState<BotSetting | null>(null);
    const [users, setUsers] = useState<TelegramUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [onboardingFilters, setOnboardingFilters] = useState<Record<string, string>>({});

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [paginationMode, setPaginationMode] = useState<"pages" | "infinite">("pages");
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const pageSize = 20;

    const [stats, setStats] = useState({
        totalUsers: 0,
        vipCount: 0,
        blockedCount: 0,
        totalSessions: 0,
    });

    const searchRef = useRef(search);
    const roleRef = useRef(roleFilter);
    const onboardingRef = useRef(onboardingFilters);
    searchRef.current = search;
    roleRef.current = roleFilter;
    onboardingRef.current = onboardingFilters;

    const onboardingMeta = useMemo(() => {
        return parseOnboardingConfig(settings?.onboarding_config);
    }, [settings?.onboarding_config]);

    const fetchSettings = useCallback(async () => {
        try {
            const res: any = await api.get("/telegram/settings");
            if (res?.data) {
                setSettings(res.data);
            }
        } catch { }
    }, []);

    const fetchOverallStats = useCallback(async () => {
        try {
            const [uRes, sRes]: any = await Promise.all([
                api.get("/telegram/users?page=1&limit=500"),
                api.get("/telegram/sessions/stats").catch(() => api.get("/telegram/sessions?page=1&limit=100")),
            ]);
            const allUsers: TelegramUser[] = uRes?.data || [];
            setStats({
                totalUsers: uRes?.meta?.total_count ?? allUsers.length,
                vipCount: allUsers.filter((u) => u.is_vip).length,
                blockedCount: allUsers.filter((u) => u.is_blocked).length,
                totalSessions: sRes?.data?.total_sessions ?? sRes?.meta?.total_count ?? (sRes?.data?.length || 0),
            });
        } catch { }
    }, []);

    const fetchUsers = useCallback(
        async (
            page = 1,
            searchTerm = searchRef.current,
            roleVal = roleRef.current,
            onbFilters = onboardingRef.current,
            append = false
        ) => {
            try {
                if (append) {
                    setIsLoadingMore(true);
                } else {
                    setUsersLoading(true);
                }

                const params = new URLSearchParams({
                    page: String(page),
                    page_size: String(pageSize),
                });
                if (searchTerm.trim()) {
                    params.set("search", searchTerm.trim());
                }
                if (roleVal && roleVal !== "all") {
                    params.set("user_role", roleVal);
                }
                if (onbFilters && Object.keys(onbFilters).length > 0) {
                    params.set("onboarding_filters", JSON.stringify(onbFilters));
                }

                const res: any = await api.get(`/telegram/users?${params.toString()}`);
                if (res?.data) {
                    if (append) {
                        setUsers((prev) => [...prev, ...res.data]);
                    } else {
                        setUsers(res.data);
                    }
                    setCurrentPage(page);
                    if (res?.meta) {
                        setTotalPages(res.meta.total_pages || 1);
                        setTotalCount(res.meta.total_count || 0);
                    }
                }
            } catch (err: any) {
                toast.error(err?.message || "Failed to load users");
            } finally {
                setUsersLoading(false);
                setIsLoadingMore(false);
            }
        },
        [toast]
    );

    useEffect(() => {
        fetchSettings();
        fetchOverallStats();
    }, [fetchSettings, fetchOverallStats]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(1, search, roleFilter, onboardingFilters, false);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, roleFilter, onboardingFilters, fetchUsers]);

    const handlePageChange = (page: number) => {
        fetchUsers(page, search, roleFilter, onboardingFilters, false);
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages && !isLoadingMore) {
            fetchUsers(currentPage + 1, search, roleFilter, onboardingFilters, true);
        }
    };

    const handleToggleVip = async (user: TelegramUser) => {
        try {
            await api.put(`/telegram/users/${user.id}/toggle-vip`, {});
            toast.success(user.is_vip ? "VIP status removed" : "User granted VIP status");
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, is_vip: !u.is_vip } : u))
            );
            fetchOverallStats();
        } catch (err: any) {
            toast.error(err?.message || "Failed to toggle VIP status");
        }
    };

    const handleToggleBlock = async (user: TelegramUser) => {
        try {
            await api.put(`/telegram/users/${user.id}/toggle-block`, {});
            toast.success(user.is_blocked ? "User unblocked" : "User blocked");
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, is_blocked: !u.is_blocked } : u))
            );
            fetchOverallStats();
        } catch (err: any) {
            toast.error(err?.message || "Failed to toggle block status");
        }
    };

    const handleSendMessage = (userIds: number[] = []) => {
        if (userIds.length > 0) {
            router.push(`/admin/bot/broadcast?target=selected_users&user_ids=${userIds.join(",")}`);
        } else {
            router.push("/admin/bot/broadcast");
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <BotPageHeader
                title="Bot Users"
                icon={Users}
                botUsername={settings?.bot_username}
                webhookOk={settings?.is_webhook_active}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                fetchUsers(1, search, roleFilter, onboardingFilters, false);
                                fetchOverallStats();
                            }}
                            disabled={usersLoading}
                            className="shadow-xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />
                            <span>Refresh Users</span>
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleSendMessage()}
                            className="shadow-xs"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Message</span>
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    label="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    variant="indigo"
                />

                <StatCard
                    label="VIP Accounts"
                    value={stats.vipCount}
                    icon={ShieldCheck}
                    variant="amber"
                />

                <StatCard
                    label="Blocked Accounts"
                    value={stats.blockedCount}
                    icon={ShieldAlert}
                    variant="rose"
                />

                <StatCard
                    label="Exam Sessions"
                    value={stats.totalSessions}
                    icon={ClipboardList}
                    variant="emerald"
                />
            </div>

            <div className="glass-panel rounded-3xl overflow-hidden shadow-xs border border-neutral-200/80 dark:border-white/10">
                <div className="p-4 border-b border-neutral-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 max-w-sm">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users by name, username, telegram ID..."
                            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedUserIds.length > 0 && (
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleSendMessage(selectedUserIds)}
                                className="shadow-xs shrink-0"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>Message Selected ({selectedUserIds.length})</span>
                            </Button>
                        )}

                        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-500/5 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-white/5 text-xs">
                            <span className="text-neutral-400 px-1 text-[11px]">Filter:</span>
                            {[
                                { id: "all", label: "All" },
                                { id: "vip", label: "VIP Only" },
                                { id: "standard", label: "Standard" },
                                { id: "blocked", label: "Blocked" },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setRoleFilter(f.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${roleFilter === f.id
                                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                                            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-4">
                    <OnboardingFilterBar
                        settings={settings}
                        filters={onboardingFilters}
                        onChange={(newFilters) => {
                            setOnboardingFilters(newFilters);
                        }}
                    />
                </div>

                {usersLoading && !isLoadingMore ? (
                    <TableSkeleton rows={8} />
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-xs text-neutral-400 dark:text-neutral-500">
                        No users found matching your query or filter criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-500/5 dark:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold border-b border-neutral-200/60 dark:border-white/5 text-[11px]">
                                <tr>
                                    <th className="w-10 px-4 py-3 text-center">
                                        <Checkbox
                                            checked={users.length > 0 && selectedUserIds.length === users.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUserIds(users.map((u) => u.id));
                                                } else {
                                                    setSelectedUserIds([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="px-5 py-3">User</th>
                                    <th className="px-5 py-3">Telegram ID</th>
                                    <th className="px-5 py-3">Total Exams</th>
                                    <th className="px-5 py-3">Period Attempt</th>
                                    <th className="px-5 py-3">VIP Quota Exemption</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Moderation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200/50 dark:divide-white/5">
                                {users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="hover:bg-white/60 dark:hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="w-10 px-4 py-3.5 text-center">
                                            <Checkbox
                                                checked={selectedUserIds.includes(u.id)}
                                                onChange={() => {
                                                    setSelectedUserIds((prev) =>
                                                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                                                    {(u.first_name?.[0] || "U").toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                        {u.first_name} {u.last_name || ""}
                                                    </div>
                                                    <div className="text-[11px] text-neutral-500 font-mono">
                                                        {u.username ? `@${u.username}` : "No username"}
                                                    </div>
                                                    {(() => {
                                                        const resolved = resolveOnboardingLabel(u.profile_data, onboardingMeta);
                                                        if (!resolved) return null;
                                                        return (
                                                            <div
                                                                className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-500/10 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md mt-0.5 max-w-[220px] truncate border border-neutral-200/50 dark:border-white/5"
                                                                title={resolved}
                                                            >
                                                                <span className="truncate">{resolved}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                                            {u.telegram_id}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                {u.total_exams ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                                            {u.period_exams_count ?? 0}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleVip(u)}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${u.is_vip
                                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                                        : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/15 border border-transparent"
                                                    }`}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                <span>{u.is_vip ? "VIP Active" : "Standard Limit"}</span>
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${u.is_blocked
                                                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                                    }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${u.is_blocked ? "bg-rose-500" : "bg-emerald-500"
                                                        }`}
                                                />
                                                <span>{u.is_blocked ? "Blocked" : "Active"}</span>
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBlock(u)}
                                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${u.is_blocked
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                                                    }`}
                                            >
                                                {u.is_blocked ? "Unblock Account" : "Block"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-4 border-t border-neutral-200/60 dark:border-white/5">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        mode={paginationMode}
                        showModeToggle={true}
                        onModeChange={setPaginationMode}
                        hasMore={currentPage < totalPages}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={handleLoadMore}
                        itemLabel="users"
                    />
                </div>
            </div>
        </div>
    );
}
