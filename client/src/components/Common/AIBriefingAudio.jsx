import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, Sparkles, Mic } from 'lucide-react';

const AIBriefingAudio = ({ companyName, ticker, recommendation, score, reasoning, pros = [], cons = [], valuation }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const buildSpeechScript = () => {
    const name = companyName || ticker || 'this company';
    const rec = (recommendation || 'HOLD').toUpperCase();
    const sc = score || 50;
    const topPro = pros && pros.length > 0 ? pros[0] : null;
    const topCon = cons && cons.length > 0 ? cons[0] : null;
    const targetPrice = valuation?.fairValuePriceTarget || null;
    const upside = valuation?.upsidePotential || null;

    let script = `Here is your sixty-second AI investment briefing for ${name}. `;
    script += `Our synthesis model gives ${name} an investment score of ${sc} out of one hundred, with an overall rating of ${rec}. `;

    if (reasoning) {
      // Shorten reasoning if too long
      const cleanReason = reasoning.split('.').slice(0, 2).join('.') + '.';
      script += `${cleanReason} `;
    }

    if (topPro) {
      script += `On the positive side, key strength is: ${topPro}. `;
    }

    if (topCon) {
      script += `Key risk factor to watch is: ${topCon}. `;
    }

    if (targetPrice) {
      script += `Our intrinsic discounted cash flow valuation projects a fair value target of ${targetPrice}${upside ? `, representing an upside potential of ${upside} percent` : ''}. `;
    }

    script += `Always perform your own due diligence before making investment decisions.`;
    return script;
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const script = buildSpeechScript();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
          <Mic className="h-4.5 w-4.5 animate-pulse" />
        </div>
        <div className="space-y-0.5 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.2 rounded-full border border-blue-500/20">
              AI Voice Briefing
            </span>
            <span className="text-[10px] text-slate-400 font-medium">60s Audio Executive Summary</span>
          </div>
          <p className="text-xs font-bold text-slate-200 truncate">
            {isPlaying ? 'Playing AI spoken investment thesis...' : isPaused ? 'Paused audio briefing' : `Listen to ${ticker || 'stock'} executive audio summary`}
          </p>
        </div>
      </div>

      {/* Controls & Animated Equalizer */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-4 mr-2">
            <span className="w-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
            <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
            <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.45s] h-2" />
            <span className="w-1 bg-blue-400 rounded-full animate-bounce h-3.5" />
          </div>
        )}

        {!isPlaying && !isPaused ? (
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Play 60s Briefing</span>
          </button>
        ) : isPlaying ? (
          <>
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause</span>
            </button>
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-1 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Stop"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handlePlay}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Resume</span>
            </button>
            <button
              onClick={handleStop}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all cursor-pointer"
              title="Stop"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIBriefingAudio;
