"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Users, Sparkles, MessageSquare } from "lucide-react";
import { BotSetting, BroadcastSendRequest, TelegramUser } from "@/lib/types";
import { api } from "@/lib/api";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BroadcastForm } from "@/components/bot/BroadcastForm";
import { StatCard } from "@/components/ui/Card";

function BroadcastContent() {
  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [vipCandidatesCount, setVipCandidatesCount] = useState(0);
  const searchParams = useSearchParams();

  const targetParam = searchParams.get("target") as BroadcastSendRequest["target_type"] | null;
  const userIdsParam = searchParams.get("user_ids");

  const initialSelectedUserIds = userIdsParam
    ? userIdsParam
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0)
    : [];

  const initialTargetType: BroadcastSendRequest["target_type"] =
    targetParam || (initialSelectedUserIds.length > 0 ? "selected_users" : "all_users");

  const fetchInitialData = useCallback(async () => {
    try {
      const [settingsRes, usersRes]: any = await Promise.all([
        api.get("/telegram/settings"),
        api.get("/telegram/users?page=1&limit=200"),
      ]);

      if (settingsRes?.data) {
        setSettings(settingsRes.data);
      }

      if (usersRes?.data && Array.isArray(usersRes.data)) {
        const list: TelegramUser[] = usersRes.data;
        const total = usersRes?.meta?.total_count ?? list.length;
        setTotalCandidates(total);
        setVipCandidatesCount(list.filter((u) => u.is_vip).length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const allowedGroupsCount = useMemo(() => {
    if (!settings?.allowed_group_ids) return 0;
    return settings.allowed_group_ids
      .replace(/\n/g, ",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [settings]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BotPageHeader
        title="Broadcast / SMS"
        icon={Send}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Audience"
          value={totalCandidates}
          icon={Users}
          variant="indigo"
          description="Registered bot users"
        />
        <StatCard
          label="VIP Candidates"
          value={vipCandidatesCount}
          icon={Sparkles}
          variant="amber"
          description="Priority candidate tier"
        />
        <StatCard
          label="Target Groups"
          value={allowedGroupsCount}
          icon={MessageSquare}
          variant="violet"
          description="Connected community chats"
        />
        <StatCard
          label="Dispatcher Queue"
          value="50ms Rate"
          icon={Send}
          variant="emerald"
          description="Telegram anti-flood guard"
        />
      </div>

      <BroadcastForm
        key={`${initialTargetType}-${initialSelectedUserIds.join(",")}`}
        settings={settings}
        initialTargetType={initialTargetType}
        initialSelectedUserIds={initialSelectedUserIds}
      />
    </div>
  );
}

export default function BotBroadcastPage() {
  return (
    <Suspense fallback={null}>
      <BroadcastContent />
    </Suspense>
  );
}
