"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Play,
  FolderTree,
  FileText,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Clock,
  Layers,
  Search,
  Sliders,
  Command,
  Gauge,
} from "lucide-react";
import { BotFlowNode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { ListSkeleton } from "@/components/ui/Skeleton";

interface BotFlowTreeProps {
  nodes: BotFlowNode[];
  loading: boolean;
  onRefresh: () => void;
  onAddRoot: () => void;
  onAddChild: (parent: BotFlowNode) => void;
  onEdit: (node: BotFlowNode) => void;
  onDelete: (node: BotFlowNode) => void;
}

export function BotFlowTree({
  nodes,
  loading,
  onAddRoot,
  onAddChild,
  onEdit,
  onDelete,
}: BotFlowTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpand = (id: number) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const filterNodes = (items: BotFlowNode[], query: string): BotFlowNode[] => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();

    return items.reduce<BotFlowNode[]>((acc, node) => {
      const matchSelf =
        node.label.toLowerCase().includes(lower) ||
        Boolean(node.trigger_command && node.trigger_command.toLowerCase().includes(lower)) ||
        Boolean(node.content_text && node.content_text.toLowerCase().includes(lower));
      const filteredChildren = node.children ? filterNodes(node.children, query) : [];

      if (matchSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }
      return acc;
    }, []);
  };

  const displayedNodes = useMemo(() => {
    return filterNodes(nodes, searchQuery);
  }, [nodes, searchQuery]);

  const renderActionBadge = (actionType: BotFlowNode["action_type"]) => {
    switch (actionType) {
      case "start_exam":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Play className="w-3 h-3" />
            Exam
          </span>
        );
      case "category_browse":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <FolderTree className="w-3 h-3" />
            Topic Explorer
          </span>
        );
      case "limits_check":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <Gauge className="w-3 h-3" />
            Limits & Quota
          </span>
        );
      case "text_message":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-white/10">
            <FileText className="w-3 h-3" />
            Information
          </span>
        );
      case "url_link":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
            <ExternalLink className="w-3 h-3" />
            External Link
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-white/10">
            <Layers className="w-3 h-3" />
            Submenu
          </span>
        );
    }
  };

  const renderNode = (node: BotFlowNode, depth = 0) => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = expandedNodes[node.id] ?? true;

    return (
      <div key={node.id} className="relative group/item">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl transition-all border border-transparent hover:border-neutral-200/80 dark:hover:border-white/10 hover:bg-white/60 dark:hover:bg-neutral-800/60 gap-3 ${
            depth > 0
              ? "ml-3 sm:ml-6 my-1 bg-white/30 dark:bg-neutral-900/30"
              : "my-1.5 bg-white/60 dark:bg-neutral-900/60 shadow-2xs"
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-500/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors shrink-0 mt-0.5 sm:mt-0"
                aria-label={isExpanded ? "Collapse branch" : "Expand branch"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {node.label}
                </span>

                {node.trigger_command && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-white/5">
                    <Command className="w-2.5 h-2.5" />
                    {node.trigger_command}
                  </span>
                )}

                {renderActionBadge(node.action_type)}

                {node.category_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-white/5 truncate max-w-[160px]">
                    <Tag className="w-2.5 h-2.5" />
                    {node.category_name}
                  </span>
                )}

                {node.action_type === "start_exam" && (
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-medium">
                    <span className="inline-flex items-center gap-1">
                      {node.question_count_mode === "ask_user"
                        ? "User Picks Count"
                        : `${node.fixed_count} Questions`}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Sliders className="w-2.5 h-2.5" />
                      {node.difficulty_mode === "ask_user"
                        ? "Candidate Choice"
                        : node.fixed_difficulty || "mixed"}
                    </span>
                    {node.timer_seconds ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {node.timer_seconds}s
                        </span>
                      </>
                    ) : null}
                  </div>
                )}

                {!node.is_active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-500 font-medium">
                    Inactive
                  </span>
                )}
              </div>

              {node.content_text && (
                <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate mt-1 max-w-2xl font-mono text-[11px]">
                  {node.content_text}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-center opacity-80 group-hover/item:opacity-100 transition-opacity">
            {node.action_type === "menu_nodes" && (
              <IconButton
                type="button"
                onClick={() => onAddChild(node)}
                variant="indigo"
                size="sm"
                title="Add submenu button"
                aria-label="Add submenu button"
              >
                <Plus className="w-3.5 h-3.5" />
              </IconButton>
            )}

            <IconButton
              type="button"
              onClick={() => onEdit(node)}
              variant="ghost"
              size="sm"
              title="Edit action"
              aria-label="Edit action"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </IconButton>

            <IconButton
              type="button"
              onClick={() => onDelete(node)}
              variant="danger"
              size="sm"
              title="Delete action"
              aria-label="Delete action"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-neutral-200/80 dark:border-white/10 ml-2 sm:ml-4 md:ml-5">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-5 space-y-4 border border-neutral-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-200/60 dark:border-white/5">
          <div className="flex-1 max-w-sm">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, commands, or messages..."
              leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
            />
          </div>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : displayedNodes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {searchQuery ? "No matching flow actions" : "No conversational flow nodes yet"}
              </div>
            </div>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onAddRoot}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Root Action</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedNodes.map((rootNode) => renderNode(rootNode, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
