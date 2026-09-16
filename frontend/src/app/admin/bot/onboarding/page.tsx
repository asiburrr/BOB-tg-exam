"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserCheck } from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotOnboardingForm } from "@/components/bot/BotOnboardingForm";

export default function BotOnboardingPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [usage, setUsage] = useState<{
    used_step_ids: string[];
    used_option_values: string[];
  }>({
    used_step_ids: [],
    used_option_values: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchSettingsAndUsage = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, usageRes]: any = await Promise.all([
        api.get("/telegram/settings"),
        api
          .get("/telegram/onboarding/usage")
          .catch(() => ({ data: { used_step_ids: [], used_option_values: [] } })),
      ]);
      if (settingsRes?.data) {
        setSettings(settingsRes.data);
      }
      if (usageRes?.data) {
        setUsage(usageRes.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load bot settings");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettingsAndUsage();
  }, [fetchSettingsAndUsage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res: any = await api.put("/telegram/settings", settings);
      if (res?.data) {
        setSettings(res.data);
      }
      toast.success("Onboarding configuration saved successfully");
      fetchSettingsAndUsage();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save onboarding configuration");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Bot Onboarding"
        icon={UserCheck}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
      />

      <BotOnboardingForm
        settings={settings}
        usage={usage}
        loading={loading}
        onChange={(updated) => setSettings(updated)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
