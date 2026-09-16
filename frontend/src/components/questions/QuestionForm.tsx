"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { QuestionCategory, QuestionItem, QuestionOption } from "@/lib/types";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";
import {
  Plus,
  Check,
  Trash2,
} from "lucide-react";

interface QuestionFormProps {
  initialQuestion?: QuestionItem | null;
  defaultCategoryId?: string;
  onSuccess?: (savedQuestion: QuestionItem, addAnother?: boolean) => void;
  onCancel?: () => void;
}

export function QuestionForm({
  initialQuestion,
  defaultCategoryId,
  onSuccess,
  onCancel,
}: QuestionFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [categoriesTree, setCategoriesTree] = useState<QuestionCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<QuestionCategory[]>([]);

  const [categoryId, setCategoryId] = useState<string>(
    initialQuestion?.category_id || defaultCategoryId || ""
  );

  const [questionText, setQuestionText] = useState(initialQuestion?.question || "");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "expert">(
    (initialQuestion?.difficulty as any) || "medium"
  );
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || "");
  const [options, setOptions] = useState<QuestionOption[]>(
    initialQuestion?.options && initialQuestion.options.length > 0
      ? initialQuestion.options.map((opt, idx) => ({
          id: opt.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          explanation: opt.explanation || "",
          sort_order: opt.sort_order ?? idx,
        }))
      : [
          { option_text: "", is_correct: true, sort_order: 0 },
          { option_text: "", is_correct: false, sort_order: 1 },
          { option_text: "", is_correct: false, sort_order: 2 },
          { option_text: "", is_correct: false, sort_order: 3 },
        ]
  );
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [treeRes, flatRes]: any = await Promise.all([
          api.get("/questions/categories/tree"),
          api.get("/questions/categories"),
        ]);
        if (treeRes?.success && treeRes.data) {
          setCategoriesTree(treeRes.data);
        }
        if (flatRes?.success && flatRes.data) {
          setFlatCategories(flatRes.data);
          if (!categoryId && flatRes.data.length > 0) {
            setCategoryId(flatRes.data[0].id);
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load categories", "Error");
      }
    };
    loadCategories();
  }, []);

  const flatCategoriesMap = useMemo(() => {
    const map = new Map<string, QuestionCategory>();
    for (const c of flatCategories) {
      map.set(c.id, c);
    }
    return map;
  }, [flatCategories]);

  const selectedCategoryBreadcrumbs = useMemo(() => {
    if (!categoryId) return [];
    const crumbs: { id: string; name: string }[] = [];
    let curr = flatCategoriesMap.get(categoryId);
    const visited = new Set<string>();
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      crumbs.unshift({ id: curr.id, name: curr.name });
      curr = curr.parent_id ? flatCategoriesMap.get(curr.parent_id) : undefined;
    }
    return crumbs;
  }, [categoryId, flatCategoriesMap]);



  const handleOptionChange = (index: number, field: keyof QuestionOption, value: any) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSetCorrectOption = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === index,
      }))
    );
  };

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        option_text: "",
        is_correct: prev.length === 0,
        sort_order: prev.length,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.info("A question must have at least 2 options", "Minimum Required");
      return;
    }
    const targetWasCorrect = options[index].is_correct;
    const next = options.filter((_, i) => i !== index);
    if (targetWasCorrect && next.length > 0) {
      next[0].is_correct = true;
    }
    setOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Please select a category for this question", "Validation Error");
      return;
    }
    if (!questionText.trim()) {
      toast.error("Question prompt cannot be empty", "Validation Error");
      return;
    }
    const trimmedOptions = options.map((opt, idx) => ({
      ...opt,
      option_text: opt.option_text.trim(),
      sort_order: idx,
    }));

    if (trimmedOptions.some((opt) => !opt.option_text)) {
      toast.error("All option fields must have text", "Validation Error");
      return;
    }

    const hasCorrect = trimmedOptions.some((opt) => opt.is_correct);
    if (!hasCorrect) {
      toast.error("Please designate at least one option as correct", "Validation Error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category_id: categoryId,
        question: questionText.trim(),
        difficulty,
        explanation: explanation.trim() || null,
        options: trimmedOptions.map((opt) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          explanation: opt.explanation?.trim() || null,
          sort_order: opt.sort_order,
        })),
      };

      let saved: QuestionItem;
      if (initialQuestion) {
        const res: any = await api.put(`/questions/${initialQuestion.id}`, payload);
        saved = res.data;
        toast.success("Question updated successfully", "Updated");
      } else {
        const res: any = await api.post("/questions", payload);
        saved = res.data;
        toast.success("Question created successfully", "Created");
      }

      if (onSuccess) {
        onSuccess(saved, addAnother);
      }

      if (addAnother) {
        setQuestionText("");
        setExplanation("");
        setOptions([
          { option_text: "", is_correct: true, sort_order: 0 },
          { option_text: "", is_correct: false, sort_order: 1 },
          { option_text: "", is_correct: false, sort_order: 2 },
          { option_text: "", is_correct: false, sort_order: 3 },
        ]);
      } else if (!onSuccess) {
        router.push("/admin/questions");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save question", "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-5 relative z-30">
        <CategoryTreeSelect
          label="Category & Taxonomy Hierarchy"
          required
          value={categoryId}
          onChange={setCategoryId}
          categoriesTree={categoriesTree}
          flatCategories={flatCategories}
          placeholder="Choose a category..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Difficulty Level
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-neutral-500/10">
              {(["easy", "medium", "hard", "expert"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-medium capitalize transition-all ${
                    difficulty === d
                      ? d === "easy"
                        ? "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                        : d === "medium"
                        ? "bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                        : d === "hard"
                        ? "bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                        : "bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Assigned Category Path
            </label>
            <div className="px-4 py-2.5 rounded-2xl bg-neutral-500/5 border border-neutral-200/50 dark:border-white/5 text-xs text-neutral-600 dark:text-neutral-300 flex items-center h-[42px] truncate">
              {selectedCategoryBreadcrumbs.length > 0 ? (
                selectedCategoryBreadcrumbs.map((c) => c.name).join(" > ")
              ) : (
                <span className="text-neutral-400">No category assigned</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <Textarea
            label="Question"
            required
            rows={4}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question here..."
          />
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-200/60 dark:border-white/5 gap-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Answer Choices
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Select the correct answer option by clicking the letter badge.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddOption}
            className="self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Choice</span>
          </Button>
        </div>

        <div className="space-y-3">
          {options.map((opt, idx) => {
            const optLetter = String.fromCharCode(65 + idx);
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  opt.is_correct
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                    : "bg-white/40 dark:bg-neutral-800/40 border-neutral-200/70 dark:border-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetCorrectOption(idx)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      opt.is_correct
                        ? "bg-emerald-600 text-white shadow-sm scale-105"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    }`}
                    title={opt.is_correct ? "Correct Answer" : "Click to mark as correct"}
                  >
                    {opt.is_correct ? <Check className="w-4 h-4 stroke-[3]" /> : optLetter}
                  </button>

                  <div className="flex-1">
                    <Input
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(idx, "option_text", e.target.value)}
                      placeholder={`Choice ${optLetter} text...`}
                      required
                    />
                  </div>

                  <IconButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveOption(idx)}
                    disabled={options.length <= 2}
                    title={options.length <= 2 ? "At least 2 choices required" : "Remove Choice"}
                    aria-label="Remove Choice"
                  >
                    <Trash2 />
                  </IconButton>
                </div>

                <div className="pl-11">
                  <Input
                    value={opt.explanation || ""}
                    onChange={(e) => handleOptionChange(idx, "explanation", e.target.value)}
                    placeholder={`Explanation for choice ${optLetter} (optional explanation for reviews)...`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-3 relative z-10">
        <Textarea
          label="General Question Explanation (Optional)"
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain the concepts, rationale, or references behind the correct answer for student post-exam review..."
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.push("/admin/questions");
            }
          }}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {!initialQuestion && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto"
            >
              Save & Add Another
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            className="shadow-sm w-full sm:w-auto"
          >
            {initialQuestion ? "Update Question" : "Save Question"}
          </Button>
        </div>
      </div>
    </form>
  );
}
