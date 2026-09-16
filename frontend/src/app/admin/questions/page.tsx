"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { QuestionCategory, QuestionItem } from "@/lib/types";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { QuestionCardSkeleton } from "@/components/questions/QuestionCardSkeleton";
import { CategoryTreeSkeleton } from "@/components/categories/CategoryTreeSkeleton";
import { CategoryCountBadge } from "@/components/categories/CategoryCountBadge";
import {
  FolderTree,
  HelpCircle,
  Plus,
  ListPlus,
  Search,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Filter,
  X,
  ArrowRightLeft,
} from "lucide-react";

function QuestionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { admin } = useAuth();
  const toast = useToast();

  const isAdministration = admin?.role === "Administration";
  const userPerms = admin?.permissions || [];
  const canCreateQuestion = isAdministration || userPerms.includes("question:create");
  const canEditQuestion = isAdministration || userPerms.includes("question:edit");
  const canDeleteQuestion = isAdministration || userPerms.includes("question:delete");

  const [categoriesTree, setCategoriesTree] = useState<QuestionCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<QuestionCategory[]>([]);
  const [isCatFilterOpen, setIsCatFilterOpen] = useState(false);
  const [catFilterSearch, setCatFilterSearch] = useState("");
  const [filterTreeExpanded, setFilterTreeExpanded] = useState<Record<string, boolean>>({});
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const urlCategoryQuery =
    searchParams.get("category") ||
    searchParams.get("category_ids") ||
    searchParams.get("categories") ||
    "";
  const selectedCategoryIds = useMemo(() => {
    if (!urlCategoryQuery) return [];
    return urlCategoryQuery
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [urlCategoryQuery]);

  const isExactFilter = searchParams.get("exact") === "true";
  const difficultyFilter = searchParams.get("difficulty") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const searchParamQuery = searchParams.get("search") || searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(searchParamQuery);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationMode, setPaginationMode] = useState<"pages" | "infinite">("pages");
  const [infinitePage, setInfinitePage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetCategoryId, setBatchTargetCategoryId] = useState("");
  const [batchMoving, setBatchMoving] = useState(false);

  const [questionToDelete, setQuestionToDelete] = useState<QuestionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === null ||
          val === "" ||
          (key === "exact" && val === "false") ||
          (key === "page" && val === "1") ||
          (key === "difficulty" && val === "all")
        ) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    setSearchInput(searchParamQuery);
  }, [searchParamQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParamQuery) {
        updateUrl({
          search: searchInput.trim() ? searchInput.trim() : null,
          page: "1",
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchParamQuery, updateUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsCatFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCategories = useCallback(async (silent: boolean = false) => {
    try {
      const [treeRes, flatRes]: any = await Promise.all([
        api.get("/questions/categories/tree"),
        api.get("/questions/categories"),
      ]);
      if (treeRes?.success && treeRes.data) {
        setCategoriesTree(treeRes.data);
        if (!silent) {
          const expandMap: Record<string, boolean> = {};
          const expandAll = (nodes: QuestionCategory[]) => {
            for (const node of nodes) {
              expandMap[node.id] = true;
              if (node.children?.length) expandAll(node.children);
            }
          };
          expandAll(treeRes.data);
          setFilterTreeExpanded(expandMap);
        }
      }
      if (flatRes?.success && flatRes.data) {
        setFlatCategories(flatRes.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load categories", "Error");
    }
  }, [toast]);

  const fetchQuestions = useCallback(async (silent: boolean = false) => {
    if (!silent) setQuestionsLoading(true);
    try {
      const targetPage = paginationMode === "infinite" ? 1 : page;
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("page_size", "15");
      if (selectedCategoryIds.length > 0) {
        params.set("category_ids", selectedCategoryIds.join(","));
        if (isExactFilter) {
          params.set("exact", "true");
        }
      }
      if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
      if (searchParamQuery.trim()) params.set("search", searchParamQuery.trim());

      const res: any = await api.get(`/questions?${params.toString()}`);
      if (res?.success && res.data) {
        setQuestions(res.data);
        if (paginationMode === "infinite") {
          setInfinitePage(1);
        }
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
          setTotalCount(res.meta.total_count || 0);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load questions", "Error");
    } finally {
      if (!silent) setQuestionsLoading(false);
    }
  }, [page, paginationMode, selectedCategoryIds, isExactFilter, difficultyFilter, searchParamQuery, toast]);

  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || questionsLoading) return;
    const nextPage = infinitePage + 1;
    if (nextPage > totalPages) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("page", nextPage.toString());
      params.set("page_size", "15");
      if (selectedCategoryIds.length > 0) {
        params.set("category_ids", selectedCategoryIds.join(","));
        if (isExactFilter) {
          params.set("exact", "true");
        }
      }
      if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
      if (searchParamQuery.trim()) params.set("search", searchParamQuery.trim());

      const res: any = await api.get(`/questions?${params.toString()}`);
      if (res?.success && res.data) {
        setQuestions((prev) => {
          const existingIds = new Set(prev.map((q) => q.id));
          const newItems = res.data.filter((q: QuestionItem) => !existingIds.has(q.id));
          return [...prev, ...newItems];
        });
        setInfinitePage(nextPage);
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
          setTotalCount(res.meta.total_count || 0);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load more questions", "Error");
    } finally {
      setIsLoadingMore(false);
    }
  }, [infinitePage, totalPages, isLoadingMore, questionsLoading, selectedCategoryIds, difficultyFilter, searchParamQuery, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const flatCategoriesMap = useMemo(() => {
    const map = new Map<string, QuestionCategory>();
    for (const c of flatCategories) {
      map.set(c.id, c);
    }
    return map;
  }, [flatCategories]);

  const toggleCategorySelection = (categoryId: string) => {
    const exists = selectedCategoryIds.includes(categoryId);
    const next = exists
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    updateUrl({
      category: next.length > 0 ? next.join(",") : null,
      page: "1",
    });
  };

  const clearCategorySelection = () => {
    updateUrl({
      category: null,
      page: "1",
    });
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
    const isSelected = selectedCategoryIds.includes(node.id);
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
          style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
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

  const toggleQuestionSelection = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map((q) => q.id));
    }
  };

  const handleOpenBatchMove = () => {
    if (selectedQuestionIds.length === 0) return;
    setBatchTargetCategoryId(flatCategories[0]?.id || "");
    setIsBatchMoveModalOpen(true);
  };

  const handleExecuteBatchMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTargetCategoryId) {
      toast.error("Please select a target destination category", "Validation Error");
      return;
    }
    setBatchMoving(true);
    try {
      const res: any = await api.post("/questions/move", {
        question_ids: selectedQuestionIds,
        target_category_id: batchTargetCategoryId,
      });
      if (res?.success) {
        toast.success(res.message || "Questions moved successfully", "Moved");
        setIsBatchMoveModalOpen(false);
        setSelectedQuestionIds([]);
        await fetchQuestions(true);
        await fetchCategories(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to move questions", "Error");
    } finally {
      setBatchMoving(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    const targetId = questionToDelete.id;
    setQuestionToDelete(null);
    setIsDeleting(true);
    setQuestions((prev) => prev.filter((q) => q.id !== targetId));
    setSelectedQuestionIds((prev) => prev.filter((id) => id !== targetId));
    setTotalCount((prev) => Math.max(0, prev - 1));

    try {
      const res: any = await api.delete(`/questions/${targetId}`);
      if (res?.success) {
        toast.success("Question deleted successfully", "Deleted");
        await fetchQuestions(true);
        await fetchCategories(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete question", "Error");
      await fetchQuestions(true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span className="text-xs text-neutral-500">Question Bank</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Questions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5 mt-1">
            <HelpCircle className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
            <span>Question Bank</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Filter hierarchically by subject groups, topics, or subtopics with downward inheritance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/categories">
            <Button variant="secondary" size="sm">
              <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
              <span>Manage Categories</span>
            </Button>
          </Link>

          {canCreateQuestion && (
            <>
              <Link href="/admin/questions/bulk">
                <Button variant="secondary" size="sm">
                  <ListPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Bulk Entry</span>
                </Button>
              </Link>
              <Link href="/admin/questions/new">
                <Button
                  variant="primary"
                  size="sm"
                  className="shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Question</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="glass-panel p-4 rounded-3xl space-y-3 relative z-30">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions by keyword..."
              rightIcon={
                searchInput ? (
                  <IconButton
                    variant="ghost"
                    size="xs"
                    rounded="full"
                    onClick={() => {
                      setSearchInput("");
                      updateUrl({ search: null, page: "1" });
                    }}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X />
                  </IconButton>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative z-40" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCatFilterOpen(!isCatFilterOpen)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium border transition-all flex items-center gap-2.5 ${
                  selectedCategoryIds.length > 0
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-xs"
                    : "bg-white/70 dark:bg-neutral-800/70 border-neutral-200/80 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {selectedCategoryIds.length === 0
                    ? "All Categories"
                    : selectedCategoryIds.length === 1
                    ? `${flatCategoriesMap.get(selectedCategoryIds[0])?.name || "1 Category"} ${
                        isExactFilter
                          ? `(${flatCategoriesMap.get(selectedCategoryIds[0])?.direct_count ?? 0} exact)`
                          : `(${flatCategoriesMap.get(selectedCategoryIds[0])?.question_count || 0})`
                      }`
                    : isExactFilter
                    ? `${selectedCategoryIds.length} Groups (Exact)`
                    : `${selectedCategoryIds.length} Groups Selected`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCatFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {isCatFilterOpen && (
                <div className="fixed inset-x-3 sm:absolute sm:inset-x-auto sm:left-0 sm:right-auto mt-2 sm:w-96 rounded-3xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-neutral-200/80 dark:border-white/10 shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-200/60 dark:border-white/5">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Group-Wise Categories</span>
                    </span>
                    {selectedCategoryIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCategorySelection}
                        className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  <div>
                    <Input
                      leftIcon={<Search className="w-3.5 h-3.5" />}
                      type="text"
                      value={catFilterSearch}
                      onChange={(e) => setCatFilterSearch(e.target.value)}
                      placeholder="Search groups & subtopics..."
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                    {categoriesTree.length === 0 ? (
                      <CategoryTreeSkeleton count={3} compact={true} />
                    ) : displayedFilterTree.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400">
                        No categories found matching &ldquo;{catFilterSearch}&rdquo;
                      </div>
                    ) : (
                      displayedFilterTree.map((node) => renderFilterNode(node, 0))
                    )}
                  </div>

                  <div className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200/50 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                        {isExactFilter ? "Exact Category Only" : "Include Subcategories"}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {isExactFilter
                          ? "Questions directly in selected topic"
                          : "Inheriting from all descendant subtopics"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateUrl({
                          exact: isExactFilter ? null : "true",
                          page: "1",
                        });
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                        isExactFilter
                          ? "bg-indigo-600 text-white border-transparent shadow-xs"
                          : "bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-white/10"
                      }`}
                    >
                      {isExactFilter ? "Exact Match" : "Include All"}
                    </button>
                  </div>

                  <div className="pt-1.5 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1">
                    <span>
                      {selectedCategoryIds.length === 0
                        ? "Select categories to filter"
                        : isExactFilter
                        ? "Exact mode active"
                        : "Inheritance mode active"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCatFilterOpen(false)}
                      className="font-semibold text-neutral-900 dark:text-white hover:underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center p-1 rounded-2xl bg-neutral-500/10 overflow-x-auto no-scrollbar max-w-full shrink-0">
              {(["all", "easy", "medium", "hard", "expert"] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    updateUrl({
                      difficulty: diff,
                      page: "1",
                    });
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium capitalize transition-all ${
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
        </div>

        {selectedCategoryIds.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-200/50 dark:border-white/5">
            <span className="text-[11px] font-medium text-neutral-400">Filtering:</span>
            {selectedCategoryIds.map((cid) => {
              const cat = flatCategoriesMap.get(cid);
              return (
                <span
                  key={cid}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                >
                  <span>{cat?.name || "Category"}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    ({isExactFilter ? `${cat?.direct_count ?? 0} direct` : `${cat?.question_count || 0} total`})
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategorySelection(cid)}
                    className="hover:opacity-100 opacity-70 p-0.5 rounded-full"
                    aria-label="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={() => {
                updateUrl({
                  exact: isExactFilter ? null : "true",
                  page: "1",
                });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                isExactFilter
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-semibold"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200/70"
              }`}
              title={isExactFilter ? "Click to include subcategories" : "Click for exact category match only"}
            >
              <span>{isExactFilter ? "Exact Match" : "Include Subcategories"}</span>
            </button>

            <button
              type="button"
              onClick={clearCategorySelection}
              className="text-xs text-rose-500 hover:underline font-semibold ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-1 pt-1 border-t border-neutral-200/50 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div>
              Showing <span className="font-semibold text-neutral-800 dark:text-neutral-200">{questions.length}</span> of{" "}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{totalCount}</span> questions
            </div>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {selectedQuestionIds.length === questions.length ? "Deselect Visible" : "Select All Visible"}
              </button>
            )}
          </div>
          {selectedCategoryIds.length > 0 && (
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Downward inheritance active (parent &rarr; subcategories)
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {questionsLoading && questions.length === 0 ? (
          <QuestionCardSkeleton count={3} />
        ) : questions.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                No questions found
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                {searchParamQuery || selectedCategoryIds.length > 0 || difficultyFilter !== "all"
                  ? "Try adjusting filters or searching with different keywords."
                  : "Start creating your question bank by adding your first question."}
              </p>
              {(searchParamQuery || selectedCategoryIds.length > 0 || difficultyFilter !== "all") && (
                <button
                  type="button"
                  onClick={() =>
                    updateUrl({
                      category: null,
                      difficulty: null,
                      search: null,
                      page: "1",
                    })
                  }
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
                >
                  Clear all filters
                </button>
              )}
            </div>
            {canCreateQuestion && (
              <Link href="/admin/questions/new">
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Question</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div
            className={`space-y-3 transition-opacity duration-150 ${
              questionsLoading ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            {questionsLoading && (
              <div className="w-full h-1 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full overflow-hidden">
                <div className="h-full bg-neutral-900 dark:bg-white rounded-full animate-pulse w-1/2 transition-all duration-200" />
              </div>
            )}
            {questions.map((q, qIndex) => {
              const isSelected = selectedQuestionIds.includes(q.id);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={
                    paginationMode === "infinite"
                      ? qIndex + 1
                      : (page - 1) * 15 + qIndex + 1
                  }
                  isSelected={isSelected}
                  onToggleSelect={toggleQuestionSelection}
                  showCheckbox={true}
                  canEdit={canEditQuestion}
                  canDelete={canDeleteQuestion}
                  onDelete={setQuestionToDelete}
                  editHref={`/admin/questions/${q.id}/edit`}
                />
              );
            })}
            {paginationMode === "infinite" && isLoadingMore && (
              <QuestionCardSkeleton count={2} />
            )}
          </div>
        )}

        <Pagination
          currentPage={paginationMode === "infinite" ? infinitePage : page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={15}
          mode={paginationMode}
          showModeToggle={true}
          onModeChange={(m) => {
            setPaginationMode(m);
            if (m === "pages" && page !== 1) {
              updateUrl({ page: "1" });
            }
          }}
          onPageChange={(p) => updateUrl({ page: p.toString() })}
          hasMore={paginationMode === "infinite" ? infinitePage < totalPages : page < totalPages}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadNextPage}
        />
      </div>

      {selectedQuestionIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-3xl bg-neutral-950/90 dark:bg-neutral-100/95 text-white dark:text-neutral-900 shadow-2xl backdrop-blur-xl border border-white/20 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs font-semibold">
            {selectedQuestionIds.length} questions selected
          </span>

          <div className="h-4 w-px bg-white/20 dark:bg-neutral-400/40" />

          {canEditQuestion && (
            <button
              type="button"
              onClick={handleOpenBatchMove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Move to Category</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedQuestionIds([])}
            className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-neutral-800/10 transition-colors"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal
        isOpen={isBatchMoveModalOpen}
        onClose={() => setIsBatchMoveModalOpen(false)}
        title="Move Selected Questions"
        description={`Reassign ${selectedQuestionIds.length} selected questions to another category.`}
        maxWidth="md"
        overflowVisible={true}
      >
        <form onSubmit={handleExecuteBatchMove} className="space-y-4">
          <CategoryTreeSelect
            label="Target Destination Category"
            required
            value={batchTargetCategoryId}
            onChange={setBatchTargetCategoryId}
            categoriesTree={categoriesTree}
            flatCategories={flatCategories}
            placeholder="Select destination category..."
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/60 dark:border-white/5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsBatchMoveModalOpen(false)}
              disabled={batchMoving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={batchMoving}
            >
              Confirm Move
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(questionToDelete)}
        onClose={() => setQuestionToDelete(null)}
        title="Delete Question"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Destructive Action</div>
              <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                Are you sure you want to delete this question? Its options and explanation will be permanently removed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuestionToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteQuestion}
              loading={isDeleting}
            >
              Delete Question
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 py-4 max-w-6xl mx-auto">
          <div className="glass-panel p-6 rounded-3xl animate-pulse h-28 border border-neutral-200/50 dark:border-white/5" />
          <QuestionCardSkeleton count={3} />
        </div>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}
