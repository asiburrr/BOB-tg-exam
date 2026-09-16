"use client";

import React, { useState, useEffect } from "react";
import { TelegramPromotion } from "@/lib/types";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: TelegramPromotion | null;
}

export function PromotionModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: PromotionModalProps) {
  const [title, setTitle] = useState("");
  const [promoType, setPromoType] = useState<TelegramPromotion["promo_type"]>("text");
  const [contentText, setContentText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<TelegramPromotion["trigger_event"]>("after_exam");
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setTitle(initialData.title || "");
      setPromoType(initialData.promo_type || "text");
      setContentText(initialData.content_text || "");
      setMediaUrl(initialData.media_url || "");
      setButtonText(initialData.button_text || "");
      setButtonUrl(initialData.button_url || "");
      setTriggerEvent(initialData.trigger_event || "after_exam");
      setTargetCategoryId(initialData.target_category_id || "");
      setPriority(initialData.priority || 0);
      setIsActive(initialData.is_active ?? true);
    } else {
      setTitle("");
      setPromoType("text");
      setContentText("");
      setMediaUrl("");
      setButtonText("");
      setButtonUrl("");
      setTriggerEvent("after_exam");
      setTargetCategoryId("");
      setPriority(0);
      setIsActive(true);
    }
    setError(null);
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Campaign title is required.");
      return;
    }
    if (!contentText.trim()) {
      setError("Campaign message text is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      promo_type: promoType,
      content_text: contentText.trim(),
      media_url: mediaUrl.trim() ? mediaUrl.trim() : null,
      button_text: buttonText.trim() ? buttonText.trim() : null,
      button_url: buttonUrl.trim() ? buttonUrl.trim() : null,
      trigger_event: triggerEvent,
      target_category_id: targetCategoryId || null,
      priority: Number(priority) || 0,
      is_active: isActive,
    };

    try {
      if (initialData?.id) {
        await api.put(`/telegram/promotions/${initialData.id}`, payload);
      } else {
        await api.post("/telegram/promotions", payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save promotion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Promotional Campaign" : "New Promotional Campaign"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs">
            {error}
          </div>
        )}

        <Input
          label="Campaign Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Medical Admission Batch Crash Course 2026"
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Format Type"
            value={promoType}
            onChange={(e) => setPromoType(e.target.value as any)}
            options={[
              { value: "text", label: "Pure Text / HTML Message" },
              { value: "photo", label: "Photo / Poster Announcement" },
              { value: "banner", label: "Banner Card" },
            ]}
          />

          <Select
            label="Trigger Hook Event"
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value as any)}
            options={[
              { value: "after_exam", label: "After Exam Completion" },
              { value: "on_start", label: "On /start Command" },
              { value: "on_limit_reached", label: "When Limit is Reached" },
              { value: "category_specific", label: "Category Specific" },
            ]}
          />
        </div>

        {triggerEvent === "category_specific" && (
          <CategoryTreeSelect
            label="Trigger Category"
            value={targetCategoryId}
            onChange={setTargetCategoryId}
            placeholder="Select category..."
          />
        )}

        <Textarea
          label="Message Body"
          required
          rows={3}
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          placeholder="Message text..."
          className="font-mono"
        />

        {(promoType === "photo" || promoType === "banner") && (
          <Input
            label="Media URL"
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/banner.jpg"
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Button Label"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Enroll Now"
          />

          <Input
            label="Destination URL"
            type="url"
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            placeholder="https://t.me/example"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Input
            label="Priority Weight"
            type="number"
            min="0"
            max="100"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />

          <div className="flex items-center pt-5">
            <Checkbox
              label="Campaign Active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/60 dark:border-white/5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
          >
            {initialData ? "Update Campaign" : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
