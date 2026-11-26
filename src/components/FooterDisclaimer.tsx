import { Info } from "lucide-react";
import { APP_DISCLAIMER } from "@/lib/constants";

export function FooterDisclaimer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-5">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 text-xs text-slate-600 sm:px-6 sm:text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
        <p className="leading-relaxed">{APP_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
