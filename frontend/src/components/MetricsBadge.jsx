import React from 'react';
import { Zap, Clock, Cpu } from 'lucide-react';

export default function MetricsBadge({ retrievalTimeMs, generationTimeMs, totalTimeMs, isSub500ms }) {
  const sub500 = isSub500ms ?? (retrievalTimeMs !== undefined && retrievalTimeMs !== null && retrievalTimeMs < 500);

  return (
    <div className="my-3 p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
      
      {/* Retrieval Metric */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Vector Search:</span>
            <strong className="text-emerald-400 font-mono">
              {typeof retrievalTimeMs === 'number' ? `${retrievalTimeMs.toFixed(1)} ms` : '--'}
            </strong>
            {sub500 && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ⚡ SUB-500MS
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500">ChromaDB Cosine Similarity</span>
        </div>
      </div>

      {/* Generation Metric */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Generation:</span>
            <strong className="text-indigo-300 font-mono">{(generationTimeMs / 1000).toFixed(2)} s</strong>
          </div>
          <span className="text-[10px] text-gray-500">Gemini 2.5 Flash</span>
        </div>
      </div>

      {/* Total Latency */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Total Latency:</span>
            <strong className="text-purple-300 font-mono">{(totalTimeMs / 1000).toFixed(2)} s</strong>
          </div>
          <span className="text-[10px] text-gray-500">End-to-End Turnaround</span>
        </div>
      </div>

    </div>
  );
}
