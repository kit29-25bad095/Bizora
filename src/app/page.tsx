import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="p-6 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">Bizora</span>
            <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              Move Your Business Forward
            </span>
          </div>
        </div>

        <Link href="/dashboard">
          <Button variant="primary" size="md">
            Open Dashboard
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bizora V1 MVP — Revenue Recovery Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
          Recover Lost Revenue. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
            Understand Every Customer.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          AI-driven intelligence built specifically for small retail, hardware, and quotation merchants.
          Detect customer inactivity, identify revenue leakage, and prepare owner-approved recovery actions.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="w-full sm:w-auto text-base px-8 py-3.5 gap-2">
              <span>Launch Live MVP Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <BarChart3 className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="text-base font-semibold text-white">Deterministic Financials</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Authoritative mathematical Net Sales, AOV, and Cash Inflows. Zero AI hallucination in core accounting.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <Users className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-base font-semibold text-white">Churn & Inactivity Radar</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Calculates purchase intervals against individual buyer cycles to flag lapsing accounts before defection.
            </p>
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <ShieldCheck className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="text-base font-semibold text-white">Human-in-the-Loop Safety</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              AI drafts win-back copy, but store owners hold 100% control. Zero automated spam; client-side handoffs only.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-600 border-t border-slate-800/80">
        Bizora MVP • Professional Software Engineering • Apache-2.0 License
      </footer>
    </div>
  );
}
