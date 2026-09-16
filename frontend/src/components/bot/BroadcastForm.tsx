"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Send,
  Users,
  MessageSquare,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Filter,
  AtSign,
  ExternalLink,
  ImageIcon,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useToast } from "@/components/feedback/Toast";
import { BotSetting, BroadcastSendRequest, TelegramUser } from "@/lib/types";
import { OnboardingFilterBar } from "./OnboardingFilterBar";
import { parseOnboardingConfig, resolveOnboardingLabel } from "@/lib/onboarding";

const EMPTY_USER_IDS: number[] = [];

export interface BroadcastFormProps {
  onSent?: () => void;
  initialTargetType?: BroadcastSendRequest["target_type"];
  initialSelectedUserIds?: number[];
  settings?: BotSetting | null;
  className?: string;
  onCancel?: () => void;
}

export function BroadcastForm({
  onSent,
  initialTargetType = "all_users",
  initialSelectedUserIds = EMPTY_USER_IDS,
  settings,
  className = "",
  onCancel,
}: BroadcastFormProps) {
  const toast = useToast();
  const [targetType, setTargetType] = useState<BroadcastSendRequest["target_type"]>(initialTargetType);
  const [customTargets, setCustomTargets] = useState("");
  const [contentText, setContentText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<TelegramUser[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesFetched, setCandidatesFetched] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(initialSelectedUserIds);
  const [onboardingFilters, setOnboardingFilters] = useState<Record<string, string>>({});
  const [onboardingCount, setOnboardingCount] = useState<number | null>(null);
  const [onboardingCountLoading, setOnboardingCountLoading] = useState(false);

  const prevInitialTypeRef = useRef(initialTargetType);

  useEffect(() => {
    if (initialTargetType !== prevInitialTypeRef.current) {
      setTargetType(initialTargetType);
      setSelectedUserIds(initialSelectedUserIds || EMPTY_USER_IDS);
      setError(null);
      prevInitialTypeRef.current = initialTargetType;
    }
  }, [initialTargetType, initialSelectedUserIds]);

  useEffect(() => {
    if (targetType === "selected_users" && !candidatesFetched && !candidatesLoading) {
      setCandidatesLoading(true);
      api
        .get("/telegram/users?page=1&limit=200")
        .then((res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            setCandidates(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setCandidatesLoading(false);
          setCandidatesFetched(true);
        });
    }
  }, [targetType, candidatesFetched, candidatesLoading]);

  useEffect(() => {
    if (targetType === "onboarding_criteria") {
      if (Object.keys(onboardingFilters).length === 0) {
        setOnboardingCount(null);
        return;
      }
      setOnboardingCountLoading(true);

      const filtersParam = encodeURIComponent(JSON.stringify(onboardingFilters));
      api
        .get(`/telegram/users?page=1&limit=1&onboarding_filters=${filtersParam}`)
        .then((res: any) => {
          if (res?.data?.total_count !== undefined) {
            setOnboardingCount(res.data.total_count);
          } else if (res?.meta?.total_count !== undefined) {
            setOnboardingCount(res.meta.total_count);
          } else if (Array.isArray(res?.data)) {
            setOnboardingCount(res.data.length);
          }
        })
        .catch(() => setOnboardingCount(null))
        .finally(() => setOnboardingCountLoading(false));
    }
  }, [targetType, onboardingFilters]);

  const onboardingMeta = useMemo(() => {
    return parseOnboardingConfig(settings?.onboarding_config);
  }, [settings?.onboarding_config]);

  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase().trim();
    return candidates.filter((c) => {
      const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
      const username = (c.username || "").toLowerCase();
      const tgId = String(c.telegram_id || "");
      const profile = (c.profile_data || "").toLowerCase();
      const onboardingText = resolveOnboardingLabel(c.profile_data, onboardingMeta).toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        tgId.includes(q) ||
        profile.includes(q) ||
        onboardingText.includes(q)
      );
    });
  }, [candidates, candidateSearch, onboardingMeta]);

  const toggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredCandidates.map((c) => c.id);
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentText.trim()) {
      setError("Message content cannot be empty.");
      return;
    }
    if (targetType === "selected_users" && selectedUserIds.length === 0) {
      setError("Please select at least one candidate from the list.");
      return;
    }
    if (targetType === "custom" && !customTargets.trim()) {
      setError("Please specify at least one target recipient ID or @username.");
      return;
    }
    if (targetType === "onboarding_criteria") {
      if (Object.keys(onboardingFilters).length === 0) {
        setError("Please specify at least one onboarding criteria.");
        return;
      }
      setCustomTargets(JSON.stringify(onboardingFilters));
    }

    try {
      setSending(true);
      setError(null);
      const payload: BroadcastSendRequest = {
        target_type: targetType,
        selected_user_ids: targetType === "selected_users" ? selectedUserIds : undefined,
        custom_targets: customTargets.trim() || undefined,
        content_text: contentText.trim(),
        media_url: mediaUrl.trim() || undefined,
        button_text: buttonText.trim() || undefined,
        button_url: buttonUrl.trim() || undefined,
      };

      const res: any = await api.post("/telegram/broadcast", payload);
      if (res?.data?.message) {
        toast.success(res.data.message);
      } else {
        toast.success("Broadcast dispatched successfully.");
      }
      if (onSent) onSent();
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch broadcast.");
    } finally {
      setSending(false);
    }
  };

  const targetOptions: {
    id: BroadcastSendRequest["target_type"];
    label: string;
    desc: string;
    icon: any;
  }[] = [
    { id: "all_users", label: "All Candidates", desc: "All active users", icon: Users },
    {
      id: "selected_users",
      label: "Selected Users",
      desc: selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : "Pick candidates",
      icon: CheckSquare,
    },
    { id: "onboarding_criteria", label: "Onboarding Filters", desc: "Filter by profile data", icon: Filter },
    { id: "vip_users", label: "VIP Only", desc: "Priority VIP accounts", icon: Sparkles },
    { id: "allowed_groups", label: "Allowed Groups", desc: "Connected group chats", icon: MessageSquare },
    { id: "custom", label: "Custom IDs", desc: "Direct chat IDs or channels", icon: AtSign },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#10141d]/90 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Target Audience
                    </h2>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Choose which segment receives this push notification
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {targetType === "all_users" && "All Candidates"}
                  {targetType === "selected_users" && `${selectedUserIds.length} Selected`}
                  {targetType === "onboarding_criteria" && "Onboarding Criteria"}
                  {targetType === "vip_users" && "VIP Accounts"}
                  {targetType === "allowed_groups" && "Allowed Groups"}
                  {targetType === "custom" && "Custom Recipients"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {targetOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = targetType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetType(opt.id)}
                      className={`p-3 text-left rounded-2xl border transition-all flex flex-col justify-between select-none ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500/30"
                          : "bg-neutral-50/50 dark:bg-white/5 border-neutral-200/60 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-neutral-400"}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{opt.label}</div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {targetType === "selected_users" && (
                <div className="pt-3 border-t border-neutral-200/50 dark:border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
                      <input
                        type="text"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Search by name, username, telegram ID..."
                        className="w-full pl-8 pr-8 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                      />
                      {candidateSearch && (
                        <button
                          type="button"
                          onClick={() => setCandidateSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-neutral-300 dark:text-neutral-700">|</span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-[11px] font-medium text-neutral-500 hover:text-rose-500"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5 border border-neutral-200/80 dark:border-white/10 rounded-2xl bg-neutral-50/50 dark:bg-black/20">
                    {candidatesLoading ? (
                      <div className="p-6 text-center text-xs text-neutral-400">Loading candidate directory...</div>
                    ) : filteredCandidates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-400">No candidates found matching query.</div>
                    ) : (
                      filteredCandidates.map((c) => {
                        const isChecked = selectedUserIds.includes(c.id);
                        const initial = c.first_name ? c.first_name.charAt(0).toUpperCase() : "U";
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleSelectUser(c.id)}
                            className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors select-none ${
                              isChecked
                                ? "bg-blue-500/10"
                                : "hover:bg-neutral-500/5"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-blue-600 dark:text-blue-400 shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-400" />
                                )}
                              </div>
                              <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                                  <span>{c.first_name} {c.last_name || ""}</span>
                                  {c.is_vip && (
                                    <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono truncate flex items-center gap-1.5">
                                  <span>{c.username ? `@${c.username}` : `ID: ${c.telegram_id}`}</span>
                                  {(() => {
                                    const resolved = resolveOnboardingLabel(c.profile_data, onboardingMeta);
                                    if (!resolved) return null;
                                    return (
                                      <span
                                        className="text-[9px] font-sans font-medium px-1.5 py-0.2 rounded bg-neutral-500/10 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 truncate max-w-[130px]"
                                        title={resolved}
                                      >
                                        {resolved}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {targetType === "onboarding_criteria" && (
                <div className="pt-3 border-t border-neutral-200/50 dark:border-white/10 space-y-3">
                  <OnboardingFilterBar
                    settings={settings}
                    filters={onboardingFilters}
                    onChange={setOnboardingFilters}
                  />
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                      Filter target users based on their onboarding survey responses
                    </span>
                    {onboardingCountLoading ? (
                      <span className="text-xs text-blue-500 animate-pulse">Calculating...</span>
                    ) : (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {onboardingCount !== null ? `${onboardingCount} Candidates` : "Select criteria"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {targetType === "custom" && (
                <div className="pt-3 border-t border-neutral-200/50 dark:border-white/10">
                  <Textarea
                    label="Recipient Chat IDs or @Channels"
                    rows={3}
                    value={customTargets}
                    onChange={(e) => setCustomTargets(e.target.value)}
                    placeholder="@channel_name, -100192837465, 123456789"
                    className="font-mono text-xs"
                    helperText="Separate multiple target IDs with commas or line breaks."
                  />
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#10141d]/90 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Message Content
                    </h2>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Compose announcement text and optional interactive media
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  {contentText.length} chars
                </span>
              </div>

              <div>
                <Textarea
                  label="Message Text"
                  required
                  rows={6}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Type your announcement, updates, or instructions..."
                />
              </div>

              <div className="pt-2 border-t border-neutral-200/50 dark:border-white/10 space-y-4">
                <Input
                  label="Banner Image URL (Optional)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  leftIcon={<ImageIcon className="w-4 h-4 text-neutral-400" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label="Inline Button Label (Optional)"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Join Official Channel"
                    leftIcon={<ExternalLink className="w-4 h-4 text-neutral-400" />}
                  />
                  <Input
                    label="Button URL Link (Optional)"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://t.me/your_channel"
                    leftIcon={<AtSign className="w-4 h-4 text-neutral-400" />}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#10141d]/90 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-white/10">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Telegram Live Preview
                </h3>
                <span className="text-[10px] bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-mono px-2 py-0.5 rounded-full">
                  Client Simulator
                </span>
              </div>

              <div className="rounded-2xl bg-[#0f141c] p-4 text-white shadow-inner border border-white/10 font-sans space-y-3">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    B
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      <span>{settings?.bot_username ? `@${settings.bot_username}` : "BOB Exam Bot"}</span>
                      <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1 py-0.2 rounded font-mono">bot</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#18222d] rounded-2xl p-3.5 space-y-2.5 border border-white/5">
                  {mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-h-48 bg-black/40 border border-white/10 relative flex items-center justify-center">
                      <Image
                        src={mediaUrl}
                        alt="Broadcast Banner Preview"
                        width={400}
                        height={200}
                        unoptimized
                        className="w-full h-auto object-cover max-h-48"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <div className="text-xs text-neutral-100 whitespace-pre-wrap leading-relaxed">
                    {contentText ? contentText : (
                      <span className="text-neutral-500 italic">
                        Message text preview will appear here as you type...
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] text-neutral-400 font-mono">
                      12:00 PM ✓✓
                    </span>
                  </div>
                </div>

                {buttonText && (
                  <div className="pt-1">
                    <div className="w-full py-2 px-3 rounded-xl bg-[#2b3a4a] text-blue-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm border border-blue-400/20">
                      <span>{buttonText}</span>
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200/50 dark:border-white/10 space-y-3">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Throttled at 50ms per message to prevent flood limits</span>
                </div>

                <div className="flex items-center gap-2">
                  {onCancel && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                      className="w-1/3"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    loading={sending}
                    className="flex-1 shadow-md"
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    <span>Send Broadcast</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
