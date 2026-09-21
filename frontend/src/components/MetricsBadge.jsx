import React from 'react';
import { Clock, Search } from 'lucide-react';

export default function MetricsBadge({ retrievalTimeMs, generationTimeMs }) {
  if (retrievalTimeMs == null && generationTimeMs == null) return null;

  return (
    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 font-normal">
      {typeof retrievalTimeMs === 'number' && (
        <span className="flex items-center gap-1">
          <Search className="w-3 h-3 text-slate-500" />
          <span>Indexed lookup:</span>
          <strong className="text-slate-300 font-mono font-medium">{retrievalTimeMs.toFixed(0)}ms</strong>
        </span>
      )}

      {typeof generationTimeMs === 'number' && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Generated in:</span>
          <strong className="text-slate-300 font-mono font-medium">{(generationTimeMs / 1000).toFixed(1)}s</strong>
        </span>
      )}
    </div>
  );
}
