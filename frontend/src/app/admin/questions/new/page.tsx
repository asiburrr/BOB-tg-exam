"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, HelpCircle, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuestionForm } from "@/components/questions/QuestionForm";

function NewQuestionContent() {
  const searchParams = useSearchParams();
  const defaultCategoryId = searchParams.get("category") || undefined;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
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
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">New Question</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5 mt-1">
            <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Create New Question</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Assign a category, write your question, and define multiple-choice options with answer keys.
          </p>
        </div>

        <div>
          <Link href={`/admin/questions/bulk${defaultCategoryId ? `?category=${defaultCategoryId}` : ""}`}>
            <Button variant="secondary" size="sm">
              <ListPlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bulk Entry Mode</span>
            </Button>
          </Link>
        </div>
      </div>

      <QuestionForm defaultCategoryId={defaultCategoryId} />
    </div>
  );
}

export default function NewQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex flex-col items-center justify-center text-neutral-400 space-y-2">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading Question Builder...</p>
        </div>
      }
    >
      <NewQuestionContent />
    </Suspense>
  );
}
