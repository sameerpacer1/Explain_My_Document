import { Info } from "lucide-react";
import { APP_DISCLAIMER } from "@/lib/constants";

export function FooterDisclaimer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-5 transition-colors dark:border-slate-800 dark:bg-slate-900/90 print:bg-white print:border-slate-200">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 text-xs text-slate-600 dark:text-slate-400 sm:px-6 sm:text-sm print:text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden="true" />
        <p className="leading-relaxed">{APP_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
