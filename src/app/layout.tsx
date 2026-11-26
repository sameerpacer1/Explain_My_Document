import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Explain-My-Document | Understand Official Documents Simply",
  description:
    "Upload a photo or PDF of any Indian official document to get a plain-language summary, risk flags, action checklist, and grounded Q&A in your language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-gradient-to-br from-sky-100/90 via-slate-100 to-teal-100/80 font-sans text-slate-900 transition-colors duration-200 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 dark:text-slate-100 print:bg-white print:text-slate-900"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-sky-700 focus:px-4 focus:py-2 focus:text-white focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
