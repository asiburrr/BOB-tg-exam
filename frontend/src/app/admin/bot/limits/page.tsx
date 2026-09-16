"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sliders, ShieldAlert, Clock, Hourglass } from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotLimitsForm } from "@/components/bot/BotLimitsForm";
import { StatCard } from "@/components/ui/Card";

export default function BotLimitsPage() {
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
      toast.error(err?.message || "Failed to load bot limits");
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
      toast.success("Attempt quotas and limits updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save limits");
    }
  };

  const quotaWindowLabel = (() => {
    if (!settings) return "Not Configured";
    switch (settings.limit_period) {
      case "hourly":
        return "Hourly Reset (60 Min)";
      case "daily":
        return "Daily Reset (Midnight UTC)";
      case "weekly":
        return "Weekly Reset (Mondays)";
      case "monthly":
        return "Monthly Reset (1st of Month)";
      case "custom_interval":
        return `Custom (${settings.custom_interval_hours || 24}h Rolling)`;
      default:
        return "Hourly Reset";
    }
  })();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Limits & Quotas"
        icon={Sliders}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Attempt Policy"
          value={settings?.limit_enabled ? "Enforced" : "Disabled"}
          icon={ShieldAlert}
          variant={settings?.limit_enabled ? "emerald" : "neutral"}
        />

        <StatCard
          label="Quota Reset Window"
          value={quotaWindowLabel}
          icon={Clock}
          variant="indigo"
        />

        <StatCard
          label="Attempt Cooldown"
          value={settings?.cooldown_minutes ? `${settings.cooldown_minutes} min rest` : "None"}
          icon={Hourglass}
          variant="amber"
        />
      </div>

      <BotLimitsForm
        settings={settings}
        loading={loading}
        onChange={(updated) => setSettings(updated)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
