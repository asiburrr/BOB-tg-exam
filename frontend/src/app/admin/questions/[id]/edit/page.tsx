"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { QuestionItem } from "@/lib/types";

function EditQuestionContent() {
  const params = useParams();
  const questionId = params?.id as string;
  const toast = useToast();

  const [question, setQuestion] = useState<QuestionItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questionId) return;
    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/questions/${questionId}`);
        if (res?.success && res.data) {
          setQuestion(res.data);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load question detail", "Error");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [questionId, toast]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-neutral-400 space-y-2">
        <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading question details...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Question Not Found
        </div>
        <p className="text-xs text-neutral-500">
          The requested question could not be found or has been deleted.
        </p>
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Questions</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
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
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Edit Question</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5 mt-1">
          <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Edit Question</span>
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Modify question prompt, adjust options, reassign category, or update explanations.
        </p>
      </div>

      <QuestionForm initialQuestion={question} />
    </div>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex flex-col items-center justify-center text-neutral-400 space-y-2">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading Question Editor...</p>
        </div>
      }
    >
      <EditQuestionContent />
    </Suspense>
  );
}
