"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Activity, Bot, Globe, Radio } from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting, WebhookInfo } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotWebhookForm } from "@/components/bot/BotWebhookForm";
import { StatCard } from "@/components/ui/Card";

export default function BotWebhookPage() {
  const toast = useToast();

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load bot credentials");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchWebhookInfo = useCallback(async () => {
    try {
      setWebhookLoading(true);
      const res: any = await api.get("/telegram/webhook-info");
      if (res?.data) {
        setWebhookInfo(res.data);
      }
    } catch {
    } finally {
      setWebhookLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchWebhookInfo()]);
  }, [fetchSettings, fetchWebhookInfo]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res: any = await api.put("/telegram/settings", settings);
      if (res?.data) {
        setSettings(res.data);
      }
      toast.success("Bot configuration saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save bot settings");
    }
  };

  const handleTestConnection = async () => {
    try {
      const res: any = await api.post("/telegram/test-connection", {});
      if (res?.success) {
        toast.success(`Connected as @${res.data?.username || "bot"}`);
        fetchSettings();
      } else {
        toast.error("Test connection failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not verify bot token");
    }
  };

  const handleSetWebhook = async () => {
    if (!settings?.webhook_url?.trim()) {
      toast.error("Please enter a Webhook URL first");
      return;
    }
    try {
      const res: any = await api.post("/telegram/set-webhook", {
        webhook_url: settings.webhook_url.trim(),
      });
      if (res?.success) {
        toast.success("Webhook registered with Telegram servers");
        fetchSettings();
        fetchWebhookInfo();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to register webhook");
    }
  };

  const handleDeleteWebhook = async () => {
    if (!confirm("Unregister webhook? The bot will stop receiving updates.")) return;
    try {
      const res: any = await api.post("/telegram/delete-webhook", {});
      if (res?.success) {
        toast.success("Webhook removed successfully");
        fetchSettings();
        fetchWebhookInfo();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete webhook");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Webhook & Diagnostics"
        icon={Activity}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Bot Identity"
          value={settings?.bot_username ? `@${settings.bot_username}` : "Not Configured"}
          icon={Bot}
          variant="indigo"
        />

        <StatCard
          label="Webhook State"
          value={settings?.is_webhook_active ? "Active & Linked" : "Inactive"}
          icon={Globe}
          variant={settings?.is_webhook_active ? "emerald" : "rose"}
        />

        <StatCard
          label="Pending Updates"
          value={webhookInfo?.pending_update_count ?? 0}
          icon={Radio}
          variant="sky"
        />
      </div>

      <BotWebhookForm
        settings={settings}
        webhookInfo={webhookInfo}
        loading={loading}
        webhookLoading={webhookLoading}
        onChange={(updated) => setSettings(updated)}
        onSave={handleSaveSettings}
        onSetWebhook={handleSetWebhook}
        onDeleteWebhook={handleDeleteWebhook}
        onTestConnection={handleTestConnection}
        onRefreshInfo={fetchWebhookInfo}
      />
    </div>
  );
}
