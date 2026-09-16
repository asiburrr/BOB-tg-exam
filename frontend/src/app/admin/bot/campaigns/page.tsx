"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Plus,
  Send,
  Eye,
  MousePointerClick,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting, TelegramPromotion } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotPromotionsList } from "@/components/bot/BotPromotionsList";
import { PromotionModal } from "@/components/bot/PromotionModal";
import { StatCard } from "@/components/ui/Card";

export default function BotCampaignsPage() {
  const router = useRouter();
  const toast = useToast();

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [promotions, setPromotions] = useState<TelegramPromotion[]>([]);
  const [loading, setLoading] = useState(false);

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<TelegramPromotion | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch {}
  }, []);

  const fetchPromotions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res: any = await api.get("/telegram/promotions");
      if (res?.data) {
        setPromotions(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load promotions");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
    fetchPromotions();
  }, [fetchSettings, fetchPromotions]);

  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p.is_active).length;
    const impressions = promotions.reduce((acc, p) => acc + (p.impressions_count || 0), 0);
    const clicks = promotions.reduce((acc, p) => acc + (p.clicks_count || 0), 0);
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
    return { total, active, impressions, clicks, ctr };
  }, [promotions]);

  const handleCreate = () => {
    setEditingPromo(null);
    setPromoModalOpen(true);
  };

  const handleEdit = (promo: TelegramPromotion) => {
    setEditingPromo(promo);
    setPromoModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/telegram/promotions/${id}`);
      toast.success("Campaign deleted");
      fetchPromotions(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete campaign");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Promotional Campaigns"
        icon={Megaphone}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/admin/bot/broadcast")}
              className="shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Broadcast</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              className="shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active Campaigns"
          value={`${stats.active} / ${stats.total}`}
          icon={Sparkles}
          variant="amber"
        />

        <StatCard
          label="Total Impressions"
          value={stats.impressions}
          icon={Eye}
          variant="indigo"
        />

        <StatCard
          label="Link Clicks"
          value={stats.clicks}
          icon={MousePointerClick}
          variant="emerald"
        />

        <StatCard
          label="Average CTR"
          value={`${stats.ctr}%`}
          icon={TrendingUp}
          variant="violet"
        />
      </div>

      <BotPromotionsList
        promotions={promotions}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNew={handleCreate}
      />

      <PromotionModal
        isOpen={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        onSaved={() => fetchPromotions(true)}
        initialData={editingPromo}
      />
    </div>
  );
}
