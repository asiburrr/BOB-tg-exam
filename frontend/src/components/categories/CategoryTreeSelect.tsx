"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FolderTree,
  Folder,
  Layers,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { QuestionCategory } from "@/lib/types";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { CategoryTreeSkeleton } from "./CategoryTreeSkeleton";
import { CategoryCountBadge } from "./CategoryCountBadge";

export interface CategoryTreeSelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  categoriesTree?: QuestionCategory[];
  flatCategories?: QuestionCategory[];
  disabledIds?: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function CategoryTreeSelect({
  value,
  onChange,
  categoriesTree: propTree,
  flatCategories: propFlat,
  disabledIds = [],
  placeholder = "Choose a category...",
  label,
  required = false,
  error,
  disabled = false,
  className = "",
}: CategoryTreeSelectProps) {
  const [internalTree, setInternalTree] = useState<QuestionCategory[]>([]);
  const [internalFlat, setInternalFlat] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tree = propTree || internalTree;
  const flat = propFlat || internalFlat;

  useEffect(() => {
    if (propTree && propFlat) return;

    let isMounted = true;
    const loadCategories = async () => {
      setLoading(true);
      try {
        const [treeRes, flatRes]: any = await Promise.all([
          api.get("/questions/categories/tree"),
          api.get("/questions/categories"),
        ]);
        if (isMounted) {
          if (treeRes?.success && treeRes.data) setInternalTree(treeRes.data);
          if (flatRes?.success && flatRes.data) setInternalFlat(flatRes.data);
        }
      } catch {
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, [propTree, propFlat]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const flatMap = useMemo(() => {
    const map = new Map<string, QuestionCategory>();
    flat.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [flat]);

  const selectedBreadcrumbs = useMemo(() => {
    if (!value) return [];
    const crumbs: QuestionCategory[] = [];
    let current = flatMap.get(value);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      crumbs.unshift(current);
      if (!current.parent_id) break;
      current = flatMap.get(current.parent_id);
    }

    return crumbs;
  }, [value, flatMap]);

  useEffect(() => {
    if (value && flatMap.size > 0) {
      const toExpand: Record<string, boolean> = {};
      let current = flatMap.get(value);
      while (current?.parent_id) {
        toExpand[current.parent_id] = true;
        current = flatMap.get(current.parent_id);
      }
      setExpandedNodes((prev) => ({ ...prev, ...toExpand }));
    }
  }, [value, flatMap]);

  const displayedTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const filterNodes = (nodes: QuestionCategory[]): QuestionCategory[] => {
      return nodes
        .map((node) => {
          const match = node.name.toLowerCase().includes(searchQuery.toLowerCase());
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          if (match || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter(Boolean) as QuestionCategory[];
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const allMatchingIds: Record<string, boolean> = {};
      const markExpanded = (nodes: QuestionCategory[]) => {
        nodes.forEach((n) => {
          if (n.children && n.children.length > 0) {
            allMatchingIds[n.id] = true;
            markExpanded(n.children);
          }
        });
      };
      markExpanded(displayedTree);
      setExpandedNodes((prev) => ({ ...prev, ...allMatchingIds }));
    }
  }, [displayedTree, searchQuery]);

  const renderTreeNode = (node: QuestionCategory, depth: number = 0) => {
    const isSelected = value === node.id;
    const isDisabled = disabledIds.includes(node.id);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = Boolean(expandedNodes[node.id]);

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          onClick={() => {
            if (isDisabled) return;
            onChange(node.id);
            setIsOpen(false);
          }}
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors select-none ${
            isDisabled
              ? "opacity-40 cursor-not-allowed text-neutral-400 dark:text-neutral-500"
              : isSelected
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold cursor-pointer"
              : "hover:bg-neutral-500/10 text-neutral-800 dark:text-neutral-200 cursor-pointer"
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 18 + 12)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }}
                className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <span
                  className={`w-1 h-1 rounded-full ${
                    isSelected ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"
                  }`}
                />
              </span>
            )}

            <div className="p-1 rounded-lg bg-neutral-500/10 shrink-0">
              {depth === 0 ? (
                <Layers className="w-3 h-3 text-indigo-500" />
              ) : (
                <Folder className="w-3 h-3 text-neutral-400" />
              )}
            </div>

            <span className="truncate">{node.name}</span>
            {isDisabled && (
              <span className="text-[10px] text-neutral-400 italic shrink-0">
                (Disabled)
              </span>
            )}
          </div>

          <CategoryCountBadge node={node} compact={true} />
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-neutral-200/60 dark:border-white/5 ml-4">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] font-normal text-neutral-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          )}
        </label>
      )}

      <div className={`relative ${isOpen ? "z-50" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all group ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/40 border-neutral-200 dark:border-white/5"
              : error
              ? "border-rose-500 bg-rose-500/5 text-neutral-900 dark:text-white"
              : isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-neutral-800"
              : "border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 hover:border-neutral-400 dark:hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FolderTree className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              {selectedBreadcrumbs.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedBreadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && (
                        <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          idx === selectedBreadcrumbs.length - 1
                            ? "font-bold text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-500 dark:text-neutral-400 font-medium"
                        }`}
                      >
                        {crumb.name}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-400">
                  {loading ? "Loading categories..." : placeholder}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && !disabled && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-500/10"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-neutral-400" />
          </div>
        </button>

        {isOpen && (
          <div className="fixed inset-x-3 sm:absolute sm:inset-x-0 mt-2 rounded-3xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-neutral-200/80 dark:border-white/10 shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-200/60 dark:border-white/5">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Group-Wise Categories Selector</span>
              </span>
              <span className="text-[11px] text-neutral-400">
                Click any node to select
              </span>
            </div>

            <div>
              <Input
                leftIcon={<Search className="w-3.5 h-3.5" />}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search category groups or subtopics..."
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
              {loading ? (
                <CategoryTreeSkeleton count={4} compact={true} />
              ) : displayedTree.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  No categories found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                displayedTree.map((node) => renderTreeNode(node, 0))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
