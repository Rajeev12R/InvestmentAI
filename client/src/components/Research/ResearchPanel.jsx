import React from 'react';
import InvestmentThesisCard from './InvestmentThesisCard';
import CatalystRadar from './CatalystRadar';
import ThesisBreakerTable from './ThesisBreakerTable';
import ResearchQuestionBox from './ResearchQuestionBox';
import { FileText, Cpu, CheckCircle2 } from 'lucide-react';

const ResearchPanel = ({ research, ticker, currency = 'USD', onOpenEvidence }) => {
  if (!research) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Research Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Institutional AI Research Analyst
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Evidence-Grounded Intelligence</span>
        </div>
      </div>

      {/* Interactive Question Answering Bar */}
      <ResearchQuestionBox ticker={ticker} onOpenEvidence={onOpenEvidence} />

      {/* Investment Thesis & Bull/Base/Bear */}
      <InvestmentThesisCard
        thesis={research.thesis}
        summary={research.summary}
        keyDrivers={research.keyDrivers}
        currency={currency}
        onOpenEvidence={onOpenEvidence}
      />

      {/* Catalysts & Thesis Breakers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <CatalystRadar catalysts={research.catalysts} />
        </div>
        <div className="lg:col-span-7">
          <ThesisBreakerTable breakers={research.thesisBreakers} />
        </div>
      </div>
    </div>
  );
};

export default ResearchPanel;
