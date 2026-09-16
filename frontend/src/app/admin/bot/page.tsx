"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  Plus,
  PlayCircle,
  Network,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting, BotFlowNode } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotFlowTree } from "@/components/bot/BotFlowTree";
import { FlowNodeModal } from "@/components/bot/FlowNodeModal";
import { StatCard } from "@/components/ui/Card";

export default function BotFlowBuilderPage() {
  const toast = useToast();

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [flowTree, setFlowTree] = useState<BotFlowNode[]>([]);
  const [loading, setLoading] = useState(true);

  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<BotFlowNode | null>(null);
  const [parentNodeId, setParentNodeId] = useState<number | null>(null);
  const [parentNodeLabel, setParentNodeLabel] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch {
    }
  }, []);

  const fetchFlow = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res: any = await api.get("/telegram/flow");
      if (res?.data) {
        setFlowTree(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load conversational flow");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchFlow()]);
  }, [fetchSettings, fetchFlow]);

  const stats = useMemo(() => {
    let total = 0;
    let rootMenus = 0;
    let examLaunchers = 0;

    const traverse = (nodes: BotFlowNode[], isRoot = false) => {
      for (const node of nodes) {
        total++;
        if (isRoot) rootMenus++;
        if (node.action_type === "start_exam") examLaunchers++;
        if (node.children?.length) {
          traverse(node.children, false);
        }
      }
    };

    traverse(flowTree, true);
    return { total, rootMenus, examLaunchers };
  }, [flowTree]);

  const handleCreateRoot = () => {
    setEditingNode(null);
    setParentNodeId(null);
    setParentNodeLabel(null);
    setNodeModalOpen(true);
  };

  const handleAddChild = (parent: BotFlowNode) => {
    setEditingNode(null);
    setParentNodeId(parent.id);
    setParentNodeLabel(parent.label);
    setNodeModalOpen(true);
  };

  const handleEditNode = (node: BotFlowNode) => {
    setEditingNode(node);
    setParentNodeId(node.parent_id || null);
    setParentNodeLabel(null);
    setNodeModalOpen(true);
  };

  const handleDeleteNode = async (node: BotFlowNode) => {
    if (
      !confirm(
        `Delete "${node.label}"? All child actions nested under this item will also be removed.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/telegram/flow/${node.id}`);
      toast.success("Action removed from bot flow");
      fetchFlow(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete node");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Flow Builder"
        icon={Layers}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateRoot}
            className="shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Root Action</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total Flow Actions"
          value={stats.total}
          icon={Network}
          variant="neutral"
        />

        <StatCard
          label="Root Level Menus"
          value={stats.rootMenus}
          icon={GitBranch}
          variant="indigo"
        />

        <StatCard
          label="Direct Exam Launchers"
          value={stats.examLaunchers}
          icon={PlayCircle}
          variant="emerald"
        />
      </div>

      <BotFlowTree
        nodes={flowTree}
        loading={loading}
        onRefresh={() => fetchFlow(true)}
        onAddRoot={handleCreateRoot}
        onAddChild={handleAddChild}
        onEdit={handleEditNode}
        onDelete={handleDeleteNode}
      />

      <FlowNodeModal
        isOpen={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        onSaved={() => fetchFlow(true)}
        initialData={editingNode}
        parentId={parentNodeId}
        parentLabel={parentNodeLabel}
      />
    </div>
  );
}
