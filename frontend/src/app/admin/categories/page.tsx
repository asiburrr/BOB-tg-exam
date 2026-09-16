"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { QuestionCategory } from "@/lib/types";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";
import { CategoryTreeSkeleton } from "@/components/categories/CategoryTreeSkeleton";
import { CategoryCountBadge } from "@/components/categories/CategoryCountBadge";
import {
  FolderTree,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Folder,
  Layers,
  HelpCircle,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ArrowRightLeft,
} from "lucide-react";

interface FlattenedOption {
  id: string;
  name: string;
  depth: number;
  disabled?: boolean;
}

export default function CategoriesPage() {
  const { admin } = useAuth();
  const toast = useToast();

  const isAdministration = admin?.role === "Administration";
  const userPerms = admin?.permissions || [];
  const canManageCategories = isAdministration || userPerms.includes("category:manage");

  const [categoriesTree, setCategoriesTree] = useState<QuestionCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuestionCategory | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState<QuestionCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [categoryToMove, setCategoryToMove] = useState<QuestionCategory | null>(null);
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string>("");
  const [moveIncludeSubcategories, setMoveIncludeSubcategories] = useState<boolean>(true);
  const [moving, setMoving] = useState<boolean>(false);

  const fetchCategories = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
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
          setExpandedNodeIds(expandMap);
        }
      }
      if (flatRes?.success && flatRes.data) {
        setFlatCategories(flatRes.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load categories", "Error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedNodeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    setExpandedNodeIds({});
  };

  const expandAll = () => {
    const expandMap: Record<string, boolean> = {};
    const expandRecursively = (nodes: QuestionCategory[]) => {
      for (const node of nodes) {
        expandMap[node.id] = true;
        if (node.children?.length) expandRecursively(node.children);
      }
    };
    expandRecursively(categoriesTree);
    setExpandedNodeIds(expandMap);
  };

  const totalQuestionsCount = useMemo(() => {
    return categoriesTree.reduce((acc, root) => acc + (root.question_count || 0), 0);
  }, [categoriesTree]);

  const getDescendantIds = useCallback((categoryId: string): Set<string> => {
    const descendants = new Set<string>();
    const findDescendants = (nodes: QuestionCategory[]) => {
      for (const node of nodes) {
        if (node.id === categoryId) {
          const collectAll = (n: QuestionCategory) => {
            descendants.add(n.id);
            if (n.children) n.children.forEach(collectAll);
          };
          if (node.children) node.children.forEach(collectAll);
          return true;
        }
        if (node.children?.length && findDescendants(node.children)) {
          return true;
        }
      }
      return false;
    };
    findDescendants(categoriesTree);
    return descendants;
  }, [categoriesTree]);

  const hierarchicalParentOptions = useMemo((): FlattenedOption[] => {
    const options: FlattenedOption[] = [];
    const forbiddenIds = editingCategory ? getDescendantIds(editingCategory.id) : new Set<string>();
    if (editingCategory) {
      forbiddenIds.add(editingCategory.id);
    }

    const traverse = (nodes: QuestionCategory[], depth: number) => {
      for (const node of nodes) {
        options.push({
          id: node.id,
          name: node.name,
          depth,
          disabled: forbiddenIds.has(node.id),
        });
        if (node.children?.length) {
          traverse(node.children, depth + 1);
        }
      }
    };

    traverse(categoriesTree, 0);
    return options;
  }, [categoriesTree, editingCategory, getDescendantIds]);

  const moveForbiddenIds = useMemo(() => {
    if (!categoryToMove) return [];
    const forbidden = getDescendantIds(categoryToMove.id);
    forbidden.add(categoryToMove.id);
    return Array.from(forbidden);
  }, [categoryToMove, getDescendantIds]);

  const handleOpenModal = (catToEdit?: QuestionCategory, defaultParentId?: string) => {
    if (catToEdit) {
      setEditingCategory(catToEdit);
      setName(catToEdit.name);
      setParentId(catToEdit.parent_id || "");
      setDescription(catToEdit.description || "");
      setSortOrder(catToEdit.sort_order || 0);
    } else {
      setEditingCategory(null);
      setName("");
      setParentId(defaultParentId || "");
      setDescription("");
      setSortOrder(0);
    }
    setIsModalOpen(true);
  };

  const handleOpenMoveModal = (cat: QuestionCategory) => {
    setCategoryToMove(cat);
    const forbidden = getDescendantIds(cat.id);
    forbidden.add(cat.id);
    const firstAvailable = flatCategories.find((c) => !forbidden.has(c.id));
    setMoveTargetCategoryId(firstAvailable ? firstAvailable.id : "");
    setMoveIncludeSubcategories(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required", "Validation Error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        parent_id: parentId ? parentId : null,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
      };

      if (editingCategory) {
        const res: any = await api.put(`/questions/categories/${editingCategory.id}`, payload);
        if (res?.success) {
          toast.success("Category updated successfully", "Saved");
          setIsModalOpen(false);
          await fetchCategories(true);
        }
      } else {
        const res: any = await api.post("/questions/categories", payload);
        if (res?.success) {
          toast.success("Category created successfully", "Created");
          setIsModalOpen(false);
          await fetchCategories(true);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save category", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const targetId = categoryToDelete.id;
    setCategoryToDelete(null);
    setDeleting(true);

    const filterOutCat = (list: QuestionCategory[], delId: string): QuestionCategory[] => {
      return list
        .filter((c) => c.id !== delId)
        .map((c) => ({
          ...c,
          children: c.children ? filterOutCat(c.children, delId) : [],
        }));
    };
    setCategoriesTree((prev) => filterOutCat(prev, targetId));
    setFlatCategories((prev) => prev.filter((c) => c.id !== targetId));

    try {
      const res: any = await api.delete(`/questions/categories/${targetId}`);
      if (res?.success) {
        toast.success("Category deleted successfully", "Deleted");
        await fetchCategories(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category", "Deletion Blocked");
      await fetchCategories(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToMove || !moveTargetCategoryId) {
      toast.error("Please select a target destination category", "Validation Error");
      return;
    }
    setMoving(true);
    try {
      const res: any = await api.post("/questions/move", {
        from_category_id: categoryToMove.id,
        target_category_id: moveTargetCategoryId,
        include_subcategories: moveIncludeSubcategories,
      });
      if (res?.success) {
        toast.success(res.message || "Questions moved successfully", "Questions Moved");
        setCategoryToMove(null);
        await fetchCategories(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to move questions", "Error");
    } finally {
      setMoving(false);
    }
  };

  const filterTree = (nodes: QuestionCategory[], term: string): QuestionCategory[] => {
    if (!term.trim()) return nodes;
    const lower = term.toLowerCase();

    return nodes.reduce<QuestionCategory[]>((acc, node) => {
      const matchesSelf = node.name.toLowerCase().includes(lower) || (node.description && node.description.toLowerCase().includes(lower));
      const filteredChildren = node.children ? filterTree(node.children, term) : [];

      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }
      return acc;
    }, []);
  };

  const displayedTree = useMemo(() => {
    return filterTree(categoriesTree, searchQuery);
  }, [categoriesTree, searchQuery]);

  const renderTreeNode = (node: QuestionCategory, depth: number = 0) => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = Boolean(expandedNodeIds[node.id]);

    return (
      <div key={node.id} className="relative group">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-2xl transition-all border border-transparent hover:border-neutral-200/70 dark:hover:border-white/10 hover:bg-white/60 dark:hover:bg-neutral-800/60 gap-2 ${
            depth > 0 ? "ml-1.5 sm:ml-4 md:ml-6 my-0.5" : "my-1 bg-white/40 dark:bg-neutral-900/40"
          }`}
        >
          <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-neutral-500/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors mt-0.5 sm:mt-0 shrink-0"
                aria-label="Toggle node"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center mt-0.5 sm:mt-0 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              </div>
            )}

            <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${depth === 0 ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-neutral-500/10 text-neutral-500"}`}>
              {depth === 0 ? <Layers className="w-4 h-4" /> : <Folder className="w-3.5 h-3.5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {node.name}
                </span>
                <CategoryCountBadge node={node} />
                {hasChildren && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 shrink-0">
                    {node.children!.length} subcategories
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-lg mt-0.5">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 shrink-0 opacity-90 sm:opacity-80 group-hover:opacity-100 transition-opacity self-end sm:self-center">
            <IconButton
              href={`/admin/questions?category=${node.id}`}
              variant="ghost"
              size="sm"
              title="View Questions in this Category"
              aria-label="View Questions in this Category"
            >
              <BookOpen />
            </IconButton>

            {canManageCategories && (
              <>
                <IconButton
                  onClick={() => handleOpenMoveModal(node)}
                  variant="warning"
                  size="sm"
                  title="Move Questions from this Category"
                  aria-label="Move Questions from this Category"
                >
                  <ArrowRightLeft />
                </IconButton>
                <IconButton
                  onClick={() => handleOpenModal(undefined, node.id)}
                  variant="indigo"
                  size="sm"
                  title="Add Subcategory"
                  aria-label="Add Subcategory"
                >
                  <FolderPlus />
                </IconButton>
                <IconButton
                  onClick={() => handleOpenModal(node)}
                  variant="ghost"
                  size="sm"
                  title="Edit Category"
                  aria-label="Edit Category"
                >
                  <Edit2 />
                </IconButton>
                <IconButton
                  onClick={() => setCategoryToDelete(node)}
                  variant="danger"
                  size="sm"
                  title="Delete Category"
                  aria-label="Delete Category"
                >
                  <Trash2 />
                </IconButton>
              </>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-neutral-200/60 dark:border-white/5 ml-1.5 sm:ml-3 md:ml-4">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/questions"
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Questions</span>
            </Link>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Category Taxonomy</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5 mt-1">
            <FolderTree className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Category Bank</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Organize nested subjects, modules, topics, and subtopics with hierarchical parenting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageCategories && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenModal()}
              className="shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Root Category</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-4 rounded-3xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Total Categories
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {flatCategories.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-500/10 text-neutral-600 dark:text-neutral-300">
            <FolderTree className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-3xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Root Category
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {categoriesTree.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-3xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Questions
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {totalQuestionsCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/60 dark:border-white/5">
          <div className="flex-1 max-w-sm">
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by name..."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {loading ? (
          <CategoryTreeSkeleton count={5} />
        ) : displayedTree.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto flex items-center justify-center">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {searchQuery ? "No matching categories" : "No categories created yet"}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching with a different keyword."
                  : "Build your taxonomy by adding root categories and nested subtopics."}
              </p>
            </div>
            {canManageCategories && !searchQuery && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenModal()}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Category</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedTree.map((node) => renderTreeNode(node, 0))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Category" : "New Category"}
        description="Organize your question bank taxonomy by placing this category in the hierarchy."
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Genetics, Human Anatomy, Pharmacology"
            autoFocus
          />

          <Select
            label="Parent Category (Dropdown Hierarchy)"
            helperText="Leave as Root for top-level domain"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None (Top-Level Root Category)</option>
            {hierarchicalParentOptions.map((opt) => {
              const indent = "   ".repeat(opt.depth);
              const prefix = opt.depth > 0 ? "↳ " : "";
              return (
                <option
                  key={opt.id}
                  value={opt.id}
                  disabled={opt.disabled}
                >
                  {indent}{prefix}{opt.name} {opt.disabled ? "(Disabled / Cannot nest under self)" : ""}
                </option>
              );
            })}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Input
              label="Sort Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              placeholder="0"
              min="0"
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Category Type
              </label>
              <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-500/10 text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 h-[38px] border border-neutral-200/80 dark:border-white/10">
                <Layers className="w-3.5 h-3.5 text-neutral-500" />
                <span>{parentId ? "Subcategory Node" : "Root Subject Domain"}</span>
              </div>
            </div>
          </div>

          <Textarea
            label="Description (Optional)"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context or syllabus scope for this category..."
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/60 dark:border-white/5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
            >
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(categoryToMove)}
        onClose={() => setCategoryToMove(null)}
        title={`Move Questions from "${categoryToMove?.name || ""}"`}
        description="Reassign questions to another category so this category can be organized or safely deleted."
        maxWidth="md"
        overflowVisible={true}
      >
        <form onSubmit={handleMoveQuestions} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5">
            <div className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{categoryToMove?.question_count || 0} Questions will be reassigned</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
              Moving questions transfers question ownership and associations to the new category. No question data will be lost.
            </p>
          </div>

          <CategoryTreeSelect
            label="Target Destination Category"
            required
            value={moveTargetCategoryId}
            onChange={setMoveTargetCategoryId}
            categoriesTree={categoriesTree}
            flatCategories={flatCategories}
            disabledIds={moveForbiddenIds}
            placeholder="Select destination category..."
          />

          <div className="pt-1">
            <Checkbox
              label="Also move questions from all nested child subcategories"
              checked={moveIncludeSubcategories}
              onChange={(e) => setMoveIncludeSubcategories(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/60 dark:border-white/5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCategoryToMove(null)}
              disabled={moving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={moving}
            >
              Confirm Move Questions
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Delete Category"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {categoryToDelete && (categoryToDelete.question_count || 0) > 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1.5">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">
                    Deletion Blocked
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      &ldquo;{categoryToDelete.name}&rdquo;
                    </span>{" "}
                    contains{" "}
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {categoryToDelete.question_count} questions
                    </span>{" "}
                    (directly or in subtopics). To protect your question bank against accidental data loss, questions must be moved to another category before this category can be deleted.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCategoryToDelete(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const cat = categoryToDelete;
                    setCategoryToDelete(null);
                    handleOpenMoveModal(cat);
                  }}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Move Questions First</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Destructive Action</div>
                  <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      &ldquo;{categoryToDelete?.name}&rdquo;
                    </span>
                    ? Any empty subcategories under it will also be deleted.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCategoryToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteCategory}
                  loading={deleting}
                >
                  Delete Category
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
