import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/feedback/Toast";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: {
    template: "%s | BOB Exam System",
    default: "BOB Exam System - Online Examination & Assessment Platform",
  },
  description: "High-performance online examination & Telegram assessment SaaS platform",
  icons: {
    icon: "/bob-logo.svg",
    shortcut: "/bob-logo.svg",
    apple: "/bob-logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/bob-logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/bob-logo.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme_mode');
                  var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased font-sans selection:bg-blue-600 selection:text-white dark:selection:bg-blue-500 dark:selection:text-white relative min-h-screen">
        <div className="ios-bg-mesh" aria-hidden="true" />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <div className="relative z-10 font-sans">
                {children}
              </div>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
