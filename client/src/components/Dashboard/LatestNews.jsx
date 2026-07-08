import React from 'react';
import { Newspaper, ExternalLink, Calendar, ArrowUpRight } from 'lucide-react';

const LatestNews = ({ news }) => {
  if (!news || news.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-center text-slate-500 text-sm font-medium h-full shadow-sm">
        No recent news feed available
      </div>
    );
  }

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full space-y-4 shadow-sm">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-blue-600 animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest News Feed</h3>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
          {news.length} Publications
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3 pr-1 scrollbar-thin">
        {news.map((item, index) => (
          <div 
            key={index} 
            className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-3.5 rounded-xl transition-all duration-200 flex gap-3.5 group relative"
          >
            {item.image && (
              <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hidden sm:block">
                <img 
                  src={item.image} 
                  alt="" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            )}

            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold uppercase truncate max-w-[125px]">
                  {item.source}
                </span>
                <span className="text-slate-450 font-semibold flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.publishedAt)}
                </span>
              </div>

              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors leading-snug cursor-pointer pr-4"
              >
                {item.title}
                <ArrowUpRight className="h-3.5 w-3.5 inline text-slate-400 group-hover:text-blue-600 ml-0.5 transition-colors" />
              </a>

              {item.description && (
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-medium">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestNews;
