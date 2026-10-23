"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  BookOpen,
  Layers,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { TelegramQuiz, QuestionCategory, QuestionItem } from "@/lib/types";
import { api } from "@/lib/api";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";
import { CategoryCountBadge } from "@/components/categories/CategoryCountBadge";

interface QuizDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TelegramQuiz> & { question_ids: string[] }) => Promise<void>;
  quiz?: TelegramQuiz | null;
  categories: QuestionCategory[];
}

export function QuizDesignerModal({
  isOpen,
  onClose,
  onSave,
  quiz,
  categories,
}: QuizDesignerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [negativeMarkingRate, setNegativeMarkingRate] = useState(0.25);
  const [isActive, setIsActive] = useState(true);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard" | "expert">("all");
  const [selectedQuestionCategoryIds, setSelectedQuestionCategoryIds] = useState<string[]>([]);
  const [isExactFilter, setIsExactFilter] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoriesTree, setCategoriesTree] = useState<QuestionCategory[]>([]);
  const [isCatFilterOpen, setIsCatFilterOpen] = useState(false);
  const [catFilterSearch, setCatFilterSearch] = useState("");
  const [filterTreeExpanded, setFilterTreeExpanded] = useState<Record<string, boolean>>({});
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const loadTree = async () => {
      try {
        const res: any = await api.get("/questions/categories/tree");
        if (res?.success && res.data) {
          setCategoriesTree(res.data);
        }
      } catch {}
    };

    loadTree();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsCatFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const flatCategoriesMap = useMemo(() => {
    const map = new Map<string, QuestionCategory>();
    const walk = (nodes: QuestionCategory[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    if (categoriesTree.length > 0) {
      walk(categoriesTree);
    } else {
      categories.forEach((c) => map.set(c.id, c));
    }
    return map;
  }, [categoriesTree, categories]);

  useEffect(() => {
    if (!isOpen) return;

    if (quiz) {
      setTitle(quiz.title || "");
      setDescription(quiz.description || "");
      setCategoryId(quiz.category_id || "");
      setNegativeMarkingRate(quiz.negative_marking_rate ?? 0.25);
      setIsActive(quiz.is_active ?? true);

      api.get<any>(`/telegram/quizzes/${quiz.id}`)
        .then((res) => {
          if (res?.data?.question_ids) {
            setSelectedQuestionIds(new Set(res.data.question_ids));
          }
        })
        .catch(() => {});
    } else {
      setTitle("");
      setDescription("");
      setCategoryId("");
      setNegativeMarkingRate(0.25);
      setIsActive(true);
      setSelectedQuestionIds(new Set());
    }
    setSelectedQuestionCategoryIds([]);
    setDifficultyFilter("all");
    setSearchQuery("");
    setError(null);
  }, [quiz, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("page_size", "500");
        if (selectedQuestionCategoryIds.length > 0) {
          params.set("category_ids", selectedQuestionCategoryIds.join(","));
          if (isExactFilter) {
            params.set("exact", "true");
          }
        }
        if (difficultyFilter !== "all") {
          params.set("difficulty", difficultyFilter);
        }
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        const res = await api.get<any>(`/questions?${params.toString()}`);
        setQuestions(res?.data || []);
      } catch (err: any) {
        setError("Failed to load questions from Question Bank.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    const timeout = setTimeout(fetchQuestions, 250);
    return () => clearTimeout(timeout);
  }, [selectedQuestionCategoryIds, isExactFilter, difficultyFilter, searchQuery, isOpen]);

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      questions.forEach((q) => next.add(q.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      questions.forEach((q) => next.delete(q.id));
      return next;
    });
  };

  const allFilteredSelected = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.every((q) => selectedQuestionIds.has(q.id));
  }, [questions, selectedQuestionIds]);

  const toggleCategorySelection = (cid: string) => {
    setSelectedQuestionCategoryIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const clearCategorySelection = () => {
    setSelectedQuestionCategoryIds([]);
  };

  const filterTreeNodes = (nodes: QuestionCategory[], term: string): QuestionCategory[] => {
    if (!term.trim()) return nodes;
    const lower = term.toLowerCase();

    return nodes.reduce<QuestionCategory[]>((acc, node) => {
      const matchesSelf = node.name.toLowerCase().includes(lower);
      const filteredChildren = node.children ? filterTreeNodes(node.children, term) : [];

      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }
      return acc;
    }, []);
  };

  const displayedFilterTree = useMemo(() => {
    return filterTreeNodes(categoriesTree, catFilterSearch);
  }, [categoriesTree, catFilterSearch]);

  const toggleFilterNodeExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilterTreeExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderFilterNode = (node: QuestionCategory, depth: number = 0) => {
    const isSelected = selectedQuestionCategoryIds.includes(node.id);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = Boolean(filterTreeExpanded[node.id]);

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          onClick={() => toggleCategorySelection(node.id)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer select-none text-xs transition-colors ${
            isSelected
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
              : "hover:bg-neutral-500/10 text-neutral-700 dark:text-neutral-300"
          }`}
          style={{ paddingLeft: `${Math.max(10, depth * 14 + 10)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleFilterNodeExpand(node.id, e)}
                className={`w-4 h-4 flex items-center justify-center rounded-sm shrink-0 transition-transform ${
                  isSelected ? "text-white dark:text-neutral-900" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
              </span>
            )}

            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="rounded-sm border-neutral-300 text-indigo-600 pointer-events-none shrink-0"
            />

            <span className="truncate">{node.name}</span>
          </div>

          <CategoryCountBadge node={node} compact={true} />
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-neutral-200/50 dark:border-white/5 ml-3">
            {node.children!.map((child) => renderFilterNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please specify a quiz title.");
      return;
    }
    if (selectedQuestionIds.size === 0) {
      setError("Please select at least 1 question for this quiz.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        time_limit_per_question: 0,
        total_time_minutes: 0,
        negative_marking_rate: negativeMarkingRate,
        is_active: isActive,
        question_ids: Array.from(selectedQuestionIds),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save quiz design.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {quiz ? "Edit Quiz Template" : "Design New Quiz"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Curate questions and configure negative marking rate for channel & group live polls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly General Knowledge Championship"
                  className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
                  required
                />
              </div>

              <div>
                <CategoryTreeSelect
                  label="Quiz Category / Tag (Optional)"
                  value={categoryId}
                  onChange={setCategoryId}
                  categoriesTree={categoriesTree}
                  flatCategories={categories}
                  placeholder="Choose category tag..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Description / Guidelines
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Instructions displayed in the Telegram channel announcement before quiz begins."
                className="w-full px-4 py-2 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Negative Marking Rate
              </label>
              <select
                value={negativeMarkingRate}
                onChange={(e) => setNegativeMarkingRate(Number(e.target.value))}
                className="w-full sm:w-64 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold"
              >
                <option value={0.0}>0.00 (No deduction)</option>
                <option value={0.2}>-0.20 pts</option>
                <option value={0.25}>-0.25 pts (Standard)</option>
                <option value={0.5}>-0.50 pts</option>
                <option value={1.0}>-1.00 pt</option>
              </select>
              <span className="text-[10px] text-neutral-400 mt-1 block">Score deducted per wrong poll answer</span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Select Questions</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                        {selectedQuestionIds.size} Selected
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Filter questions by criteria, group-wise category, and difficulty level
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={allFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shadow-2xs"
                    >
                      {allFilteredSelected ? "Deselect Filtered" : "Select All Filtered"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <input
                      type="text"
                      placeholder="Search questions by criteria..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCatFilterOpen(!isCatFilterOpen)}
                      className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 ${
                        selectedQuestionCategoryIds.length > 0
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-xs"
                          : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FolderTree className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {selectedQuestionCategoryIds.length === 0
                            ? "All Categories"
                            : selectedQuestionCategoryIds.length === 1
                            ? flatCategoriesMap.get(selectedQuestionCategoryIds[0])?.name || "1 Category"
                            : `${selectedQuestionCategoryIds.length} Groups`}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isCatFilterOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isCatFilterOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                            <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Group-Wise Categories</span>
                          </span>
                          {selectedQuestionCategoryIds.length > 0 && (
                            <button
                              type="button"
                              onClick={clearCategorySelection}
                              className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={catFilterSearch}
                            onChange={(e) => setCatFilterSearch(e.target.value)}
                            placeholder="Search groups & subtopics..."
                            className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                          />
                          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2" />
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                          {displayedFilterTree.length === 0 ? (
                            <div className="py-6 text-center text-xs text-neutral-400">
                              No categories found
                            </div>
                          ) : (
                            displayedFilterTree.map((node) => renderFilterNode(node, 0))
                          )}
                        </div>

                        <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200/50 dark:border-white/5 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                              {isExactFilter ? "Exact Category Only" : "Include Subcategories"}
                            </span>
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              {isExactFilter ? "Only questions directly in group" : "Inherit from descendant subtopics"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsExactFilter(!isExactFilter)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                              isExactFilter
                                ? "bg-indigo-600 text-white border-transparent"
                                : "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-white/10"
                            }`}
                          >
                            {isExactFilter ? "Exact" : "Inherit"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center p-1 rounded-xl bg-neutral-500/10 overflow-x-auto no-scrollbar shrink-0">
                    {(["all", "easy", "medium", "hard", "expert"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                          difficultyFilter === diff
                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold"
                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedQuestionCategoryIds.length > 0 || difficultyFilter !== "all" || searchQuery.trim()) && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-neutral-500 pt-0.5">
                    <span className="text-neutral-400 font-medium">Filtering by:</span>
                    {selectedQuestionCategoryIds.map((cid) => {
                      const cat = flatCategoriesMap.get(cid);
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        >
                          <span>{cat?.name || "Category"}</span>
                          <button
                            type="button"
                            onClick={() => toggleCategorySelection(cid)}
                            className="hover:text-rose-400"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    {difficultyFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        <span className="capitalize">{difficultyFilter}</span>
                        <button
                          type="button"
                          onClick={() => setDifficultyFilter("all")}
                          className="hover:text-rose-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">
                        <span>&quot;{searchQuery}&quot;</span>
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="hover:text-rose-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuestionCategoryIds([]);
                        setDifficultyFilter("all");
                        setSearchQuery("");
                      }}
                      className="text-[10px] text-rose-500 hover:underline font-semibold ml-1"
                    >
                      Reset All
                    </button>
                  </div>
                )}
              </div>

              <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
                {loadingQuestions ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    Loading questions from bank...
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No questions found matching criteria. Try adjusting category filter or search query.
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.has(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleSelectQuestion(q.id)}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/30"
                            : "hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                        }`}
                      >
                        <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
                            {idx + 1}. {q.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {q.category_name && (
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                                {q.category_name}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                                q.difficulty === "easy"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                                  : q.difficulty === "medium"
                                  ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                                  : q.difficulty === "hard"
                                  ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                                  : "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {q.options?.length || 0} Options
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200/60 dark:border-white/10 shrink-0 bg-neutral-50/80 dark:bg-neutral-900/80">
            <span className="text-xs text-neutral-500 font-medium">
              Total Questions in Quiz:{" "}
              <b className="text-neutral-900 dark:text-neutral-100 font-bold">
                {selectedQuestionIds.size}
              </b>
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedQuestionIds.size === 0}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? "Saving..." : quiz ? "Update Quiz" : "Create Quiz"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
