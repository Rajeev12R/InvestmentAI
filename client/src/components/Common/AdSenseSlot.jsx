import React, { useEffect } from 'react';

const AdSenseSlot = ({ slotId = 'default-slot', format = 'auto', className = '' }) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      // AdSense graceful catch
    }
  }, []);

  return (
    <div className={`my-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2 text-center text-xs text-slate-400 ${className}`}>
      <div className="flex items-center justify-between px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
        <span>Advertisement</span>
        <span>Google AdSense</span>
      </div>
      
      {/* Real AdSense Ins tag */}
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXX"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseSlot;
