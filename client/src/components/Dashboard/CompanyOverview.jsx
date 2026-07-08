import React, { useState } from 'react';
import { Building2, Globe, Users, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const CompanyOverview = ({ profile }) => {
  const [expanded, setExpanded] = useState(false);

  if (!profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-450 text-sm font-medium h-full shadow-sm">
        Profile data unavailable
      </div>
    );
  }

  const {
    name,
    ticker,
    exchange,
    industry,
    sector,
    country,
    website,
    employees,
    description
  } = profile;

  const formattedUrl = website && !website.startsWith('http') ? `https://${website}` : website;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-full shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company Overview</h3>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{name}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full uppercase border border-slate-200">
              {ticker}
            </span>
            <span className="block text-[10px] font-semibold text-slate-450 mt-1.5 uppercase">
              {exchange || 'Exchange'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-b border-slate-100 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-450">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Sector</span>
            </div>
            <p className="font-semibold text-slate-800 truncate">{sector || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-450">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Industry</span>
            </div>
            <p className="font-semibold text-slate-800 truncate">{industry || 'N/A'}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-450">
              <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Employees</span>
            </div>
            <p className="font-bold text-slate-800">
              {employees ? Number(employees).toLocaleString() : 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-450">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Country</span>
            </div>
            <p className="font-semibold text-slate-800 truncate">{country || 'N/A'}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
            Business Profile Summary
          </span>
          <p className={`text-xs text-slate-650 leading-relaxed font-normal transition-all duration-300 ${
            expanded ? '' : 'line-clamp-4'
          }`}>
            {description || 'No corporate description is available for this company.'}
          </p>
          {description && description.length > 250 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 stroke-[2.5]" /> Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 stroke-[2.5]" /> Show Full Summary
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {website && (
        <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">
          <a
            href={formattedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase"
          >
            <span>Corporate Website</span>
            <ExternalLink className="h-3 w-3 text-blue-600" />
          </a>
        </div>
      )}
    </div>
  );
};

export default CompanyOverview;
