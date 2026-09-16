"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Lock, Users, ShieldAlert, Radio, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotCommunityForm } from "@/components/bot/BotCommunityForm";
import { StatCard } from "@/components/ui/Card";

export default function BotCommunityPage() {
  const toast = useToast();

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load community access criteria");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res: any = await api.put("/telegram/settings", settings);
      if (res?.data) {
        setSettings(res.data);
      }
      toast.success("Community access criteria updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save criteria");
    }
  };

  const channelCount = useMemo(() => {
    if (!settings?.force_join_channels) return 0;
    try {
      const parsed = JSON.parse(settings.force_join_channels);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [settings?.force_join_channels]);

  const allowedGroupsCount = useMemo(() => {
    if (!settings?.allowed_group_ids) return 0;
    return settings.allowed_group_ids
      .replace(/\n/g, ",")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean).length;
  }, [settings?.allowed_group_ids]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Access & Community"
        icon={ShieldCheck}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Mandatory Join"
          value={settings?.force_join_enabled ? "Enforced" : "Disabled"}
          icon={Lock}
          variant={settings?.force_join_enabled ? "emerald" : "neutral"}
        />

        <StatCard
          label="Required Communities"
          value={channelCount}
          icon={Radio}
          variant="indigo"
        />

        <StatCard
          label="Group Policy"
          value={settings?.group_access_mode === "allowed_only" ? "Selected Only" : "Block All"}
          icon={Users}
          variant="amber"
        />

        <StatCard
          label="Authorized Groups"
          value={allowedGroupsCount}
          icon={ShieldAlert}
          variant="violet"
        />
      </div>

      <BotCommunityForm
        settings={settings}
        loading={loading}
        onChange={(updated) => setSettings(updated)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
