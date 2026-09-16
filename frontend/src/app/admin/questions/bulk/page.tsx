"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ListPlus,
  Sparkles,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/feedback/Toast";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";
import {
  parseBulkQuestions,
  BLANK_TEMPLATE,
  FILLED_SAMPLE_TEMPLATE,
  ParsedQuestion,
} from "@/lib/questionParser";
import { api } from "@/lib/api";

function BulkQuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [categoryId, setCategoryId] = useState<string>(
    searchParams.get("category") || ""
  );
  const [defaultDifficulty, setDefaultDifficulty] = useState<
    "easy" | "medium" | "hard" | "expert"
  >("medium");

  const [rawText, setRawText] = useState<string>(FILLED_SAMPLE_TEMPLATE);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    return parseBulkQuestions(rawText, defaultDifficulty);
  }, [rawText, defaultDifficulty]);

  const canImport =
    Boolean(categoryId) &&
    parseResult.questions.length > 0 &&
    parseResult.errorCount === 0;

  const handleImport = async () => {
    if (!categoryId) {
      toast.error("Please select a target destination category", "Validation Error");
      return;
    }

    if (parseResult.questions.length === 0) {
      toast.error("No questions found to import", "Validation Error");
      return;
    }

    if (parseResult.errorCount > 0) {
      toast.error(
        `Please resolve the ${parseResult.errorCount} error(s) before importing`,
        "Parsing Error"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = parseResult.questions.map((q) => ({
        category_id: categoryId,
        question: q.question,
        difficulty: q.difficulty,
        explanation: q.explanation,
        options: q.options.map((opt, idx) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          explanation: opt.explanation,
          sort_order: idx,
        })),
      }));

      const res: any = await api.post("/questions/bulk", payload);
      if (res?.success) {
        toast.success(
          `Successfully imported ${res.data?.inserted_count || payload.length} questions`,
          "Bulk Import Complete"
        );
        router.push(`/admin/questions?category=${categoryId}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to import questions", "Server Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Bulk Entry
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5 mt-1">
            <ListPlus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Bulk Question Entry</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Paste formatted questions with custom options and explanations for instant batch ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsHelpOpen(true)}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Format Guide</span>
          </Button>
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4 relative z-30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <CategoryTreeSelect
            label="Destination Category"
            required
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Select category to assign imported questions..."
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Default Difficulty Level
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-neutral-500/10">
              {(["easy", "medium", "hard", "expert"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDefaultDifficulty(d)}
                  className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-medium capitalize transition-all ${defaultDifficulty === d
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
            <p className="text-[11px] text-neutral-400">
              Used when a question does not contain an explicit &ldquo;Difficulty:&rdquo; tag.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Paste Formatted Questions</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRawText(BLANK_TEMPLATE)}
                className="text-[11px] px-2 py-1 rounded-lg hover:bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 font-medium transition-colors flex items-center gap-1"
                title="Insert empty skeleton template"
              >
                <FileText className="w-3 h-3" />
                <span>Template</span>
              </button>
              <button
                type="button"
                onClick={() => setRawText(FILLED_SAMPLE_TEMPLATE)}
                className="text-[11px] px-2 py-1 rounded-lg hover:bg-neutral-500/10 text-indigo-600 dark:text-indigo-400 font-medium transition-colors flex items-center gap-1"
                title="Insert filled demonstration example"
              >
                <Sparkles className="w-3 h-3" />
                <span>Sample</span>
              </button>
              <button
                type="button"
                onClick={() => setRawText("")}
                className="text-[11px] px-2 py-1 rounded-lg hover:bg-rose-500/10 text-rose-500 font-medium transition-colors flex items-center gap-1"
                title="Clear editor"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <Textarea
            rows={24}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Type or paste questions here with --- separator..."
            className="font-mono text-xs p-4 rounded-3xl"
          />

          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
            <span>
              Separate questions with <code className="text-indigo-500 font-bold">---</code>
            </span>
            <span>
              Mark correct choice with <code className="text-emerald-500 font-bold">*</code> (e.g. <code className="text-emerald-500 font-bold">[C*]</code>)
            </span>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Live Preview</span>
            </span>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${parseResult.questions.length === 0
                  ? "bg-neutral-500/10 text-neutral-400"
                  : parseResult.errorCount === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
              >
                {parseResult.questions.length === 0
                  ? "0 Questions"
                  : parseResult.errorCount === 0
                    ? `${parseResult.validCount} Questions Ready`
                    : `${parseResult.errorCount} Error(s) Found`}
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {parseResult.questions.length === 0 ? (
              <div className="glass-panel p-10 rounded-3xl text-center space-y-2 text-neutral-400">
                <FileText className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-medium">No questions detected yet</p>
                <p className="text-[11px] text-neutral-500">
                  Paste questions on the left or click &ldquo;Sample&rdquo; to see a preview.
                </p>
              </div>
            ) : (
              parseResult.questions.map((q: ParsedQuestion, idx: number) => {
                const diffColor =
                  q.difficulty === "easy"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : q.difficulty === "expert"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      : q.difficulty === "hard"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

                return (
                  <div
                    key={idx}
                    className={`glass-panel p-4 rounded-3xl space-y-3 transition-all border ${!q.isValid
                      ? "border-rose-500/40 bg-rose-500/5 shadow-xs"
                      : "hover:border-neutral-300 dark:hover:border-white/15"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {q.questionNumber || idx + 1}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${diffColor}`}
                        >
                          {q.difficulty}
                        </span>
                      </div>

                      {!q.isValid && (
                        <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Needs Attention</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-relaxed">
                      {q.question || <span className="text-neutral-400 italic">Empty question prompt</span>}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.letter}
                          className={`flex flex-col p-2.5 rounded-xl text-xs transition-colors border ${opt.is_correct
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-medium"
                            : "bg-neutral-500/5 border-transparent text-neutral-700 dark:text-neutral-300"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${opt.is_correct
                                  ? "bg-emerald-600 text-white"
                                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                                  }`}
                              >
                                {opt.letter}
                              </span>
                              <span className="truncate">
                                {opt.option_text || (
                                  <span className="text-neutral-400 italic">Empty choice</span>
                                )}
                              </span>
                            </div>

                            {opt.is_correct && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                                <Check className="w-3 h-3" />
                                <span>Correct</span>
                              </span>
                            )}
                          </div>

                          {opt.explanation && (
                            <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1 pl-7 leading-relaxed">
                              ↳ <span className="font-semibold">Explanation:</span> {opt.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">
                          General Explanation:
                        </span>
                        {q.explanation}
                      </div>
                    )}

                    {!q.isValid && q.errors.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                        {q.errors.map((err, errIdx) => (
                          <div
                            key={errIdx}
                            className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-4 z-40 shadow-xl border border-neutral-200/80 dark:border-white/10 backdrop-blur-xl">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            {parseResult.validCount} of {parseResult.questions.length} questions ready to import.
            {!categoryId && " Please select a destination category above."}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => router.push("/admin/questions")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleImport}
            disabled={!canImport || isSubmitting}
            loading={isSubmitting}
          >
            <ListPlus className="w-4 h-4" />
            <span>
              Import {parseResult.validCount > 0 ? `${parseResult.validCount} Questions` : "Questions"}
            </span>
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Bulk Entry Format Guide"
        description="Follow this syntax to paste multiple questions with zero collisions or errors."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-neutral-700 dark:text-neutral-300">
          <div className="space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
              1. The Break Syntax (Zero Collision)
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Every question ends with <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-bold text-indigo-500">---</code> on its own line. This completely prevents text from one question from bleeding into the next.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
              2. Numbering & Clean Ingestion
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Start with <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono">Question 1:</code> or <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono">1. </code>. The formatter automatically strips this prefix before saving.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
              3. Options & Correct Answers
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Use bracketed letters: <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono">[A]</code>, <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono">[B]</code>, etc. To mark a choice as correct, simply put an asterisk inside: <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono text-emerald-600 font-bold">[C*]</code>.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
              4. Explanations (100% Optional)
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Place <code className="bg-neutral-500/10 px-1.5 py-0.5 rounded font-mono">Explanation: ...</code> right under an option to explain that choice, or below the question for an overall question explanation. Both are completely optional.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsHelpOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function BulkQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400 space-y-2">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading bulk question editor...</p>
        </div>
      }
    >
      <BulkQuestionsContent />
    </Suspense>
  );
}
