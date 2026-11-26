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
        className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-900 transition-colors duration-200 dark:text-slate-100 print:bg-white print:text-slate-900"
      >
        {/* Fixed full-bleed background image (hidden when printing to PDF) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat print:hidden"
          style={{ backgroundImage: "url('/images/bg-pattern.jpg')" }}
        >
          <div className="absolute inset-0 bg-slate-950/15 transition-colors duration-200 dark:bg-slate-950/45" />
        </div>

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
