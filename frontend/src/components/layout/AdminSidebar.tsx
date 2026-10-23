"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HelpCircle, User, X, ChevronDown, Bot, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin } = useAuth();

  const isAdministration = admin?.role === "Administration";
  const userPerms = admin?.permissions || [];

  const isQuestionBankActive = pathname.startsWith("/admin/questions") || pathname.startsWith("/admin/categories");
  const [questionBankOpen, setQuestionBankOpen] = React.useState(isQuestionBankActive);

  const isBotActive = pathname.startsWith("/admin/bot");
  const [botOpen, setBotOpen] = React.useState(isBotActive);

  React.useEffect(() => {
    if (isQuestionBankActive) {
      setQuestionBankOpen(true);
    }
  }, [isQuestionBankActive]);

  React.useEffect(() => {
    if (isBotActive) {
      setBotOpen(true);
    }
  }, [isBotActive]);

  const hasQuestionAccess = isAdministration || userPerms.includes("question:view");
  const hasCategoryAccess = isAdministration || userPerms.includes("category:manage") || userPerms.includes("question:view");
  const hasBotAccess = isAdministration || userPerms.includes("bot:manage");
  const hasAdminManageAccess = isAdministration || userPerms.includes("admin:manage");

  const initial = admin?.name ? admin.name.charAt(0).toUpperCase() : "A";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/95 dark:bg-neutral-950/95 md:bg-white/70 md:dark:bg-neutral-900/60 md:backdrop-blur-2xl glass-nav text-neutral-800 dark:text-neutral-200 transition-colors select-none">
      <div className="h-14 flex items-center justify-between px-5 border-b border-neutral-200/50 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/bob-logo.svg"
              alt="BOB Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            BOB Exam
          </span>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-xl text-neutral-500 hover:bg-neutral-500/10 active:scale-95 transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          <Link
            href="/admin"
            prefetch={true}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ${pathname === "/admin"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md font-semibold active:scale-[0.98]"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white active:scale-[0.98]"
              }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${pathname === "/admin" ? "text-white dark:text-neutral-900" : "text-neutral-500"}`} />
            <span>Dashboard</span>
          </Link>

          {hasQuestionAccess && (
            <div className="space-y-1 pt-0.5">
              <button
                type="button"
                onClick={() => setQuestionBankOpen(!questionBankOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all group ${isQuestionBankActive
                    ? "text-neutral-950 dark:text-neutral-50 font-semibold bg-neutral-500/10"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className={`w-4 h-4 ${isQuestionBankActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`} />
                  <span>Question Bank</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${questionBankOpen ? "rotate-180 text-neutral-700 dark:text-neutral-300" : ""
                    }`}
                />
              </button>

              {questionBankOpen && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-neutral-200/60 dark:border-white/10 ml-5 transition-all">
                  <Link
                    href="/admin/questions"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/questions"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/questions" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Questions</span>
                  </Link>

                  {hasCategoryAccess && (
                    <Link
                      href="/admin/categories"
                      prefetch={true}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/categories"
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/categories" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                      <span>Categories</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {hasBotAccess && (
            <div className="space-y-1 pt-0.5">
              <button
                type="button"
                onClick={() => setBotOpen(!botOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all group ${isBotActive
                    ? "text-neutral-950 dark:text-neutral-50 font-semibold bg-neutral-500/10"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Bot className={`w-4 h-4 ${isBotActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`} />
                  <span>Telegram Bot</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${botOpen ? "rotate-180 text-neutral-700 dark:text-neutral-300" : ""
                    }`}
                />
              </button>

              {botOpen && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-neutral-200/60 dark:border-white/10 ml-5 transition-all">
                  <Link
                    href="/admin/bot"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Flow Builder</span>
                  </Link>

                  <Link
                    href="/admin/bot/limits"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/limits"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/limits" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Limits & Quota</span>
                  </Link>

                  <Link
                    href="/admin/bot/onboarding"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/onboarding"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/onboarding" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Onboarding</span>
                  </Link>

                  <Link
                    href="/admin/bot/community"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/community"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/community" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Access & Community</span>
                  </Link>

                  <Link
                    href="/admin/bot/campaigns"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/campaigns"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/campaigns" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Campaigns & Ads</span>
                  </Link>

                  <Link
                    href="/admin/bot/quizzes"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/quizzes"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/quizzes" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Channel Quizzes</span>
                  </Link>

                  <Link
                    href="/admin/bot/broadcast"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/broadcast"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/broadcast" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Broadcast / SMS</span>
                  </Link>

                  <Link
                    href="/admin/bot/users"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/users" || pathname === "/admin/bot/users"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/users" || pathname === "/admin/bot/users" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Bot Users</span>
                  </Link>

                  <Link
                    href="/admin/bot/sessions"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/sessions"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/sessions" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Exam Sessions</span>
                  </Link>

                  <Link
                    href="/admin/bot/webhook"
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${pathname === "/admin/bot/webhook"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pathname === "/admin/bot/webhook" ? "bg-white dark:bg-neutral-900" : "bg-neutral-400"}`} />
                    <span>Webhook & API</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {hasAdminManageAccess && (
            <Link
              href="/admin/users"
              prefetch={true}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ${pathname === "/admin/users"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md font-semibold active:scale-[0.98]"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white active:scale-[0.98]"
                }`}
            >
              <Shield className={`w-4 h-4 ${pathname === "/admin/users" ? "text-white dark:text-neutral-900" : "text-neutral-500"}`} />
              <span>Administrators</span>
            </Link>
          )}

          <Link
            href="/admin/profile"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all ${pathname === "/admin/profile"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md font-semibold active:scale-[0.98]"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-900 dark:hover:text-white active:scale-[0.98]"
              }`}
          >
            <User className={`w-4 h-4 ${pathname === "/admin/profile" ? "text-white dark:text-neutral-900" : "text-neutral-500"}`} />
            <span>Profile</span>
          </Link>
        </nav>
      </div>

      {admin && (
        <div className="p-3 border-t border-neutral-200/50 dark:border-white/10 shrink-0">
          <Link
            href="/admin/profile"
            onClick={onCloseMobile}
            className="p-2.5 rounded-2xl flex items-center gap-2.5 hover:bg-neutral-500/10 transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {initial}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {admin.name}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                {admin.email}
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="fixed top-0 left-0 bottom-0 w-56 border-r border-neutral-200/50 dark:border-white/10 z-40 overflow-hidden">
          {sidebarContent}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
