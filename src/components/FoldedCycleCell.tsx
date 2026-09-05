import React from 'react';
import { CellDensity } from '../types';
import { useI18n } from '../lib/i18n';

interface FoldedCycleCellProps {
  start: number;
  end: number;
  count: number;
  symbol: string;
  busDataText?: string;
  density?: CellDensity;
  onUnfold: () => void;
}

export const FoldedCycleCell: React.FC<FoldedCycleCellProps> = ({
  start,
  end,
  count,
  symbol,
  busDataText,
  density = 'standard',
  onUnfold,
}) => {
  const { lang } = useI18n();
  const isHold = symbol === '.';
  const isHigh = symbol === '1' || symbol === 'h' || symbol === 'H';
  const isLow = symbol === '0' || symbol === 'l' || symbol === 'L';
  const isClock = symbol === 'p' || symbol === 'P' || symbol === 'n' || symbol === 'N';
  const isBus = symbol === '=' || (symbol >= '2' && symbol <= '9');

  const widthClass =
    density === 'mini' ? 'w-[36px] h-[26px]' : density === 'compact' ? 'w-[42px] h-[34px]' : 'w-[48px] h-[48px]';

  return (
    <button
      type="button"
      onClick={onUnfold}
      className={`${widthClass} relative group rounded-lg border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-between p-0.5 select-none ${
        isHold
          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:border-indigo-500 hover:bg-indigo-100/70'
          : isHigh
          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
          : isLow
          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-500'
          : isClock
          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:border-blue-500'
          : isBus
          ? 'bg-violet-50/70 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:border-violet-500'
          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
      }`}
      title={
        lang === 'zh'
          ? `已收起 T${start}~T${end} (共 ${count} 拍连续保持)。点击立即展开编辑`
          : `Folded T${start}~T${end} (${count} cycles hold). Click to expand`
      }
    >
      {/* Top Header: Range indicators */}
      <div className="flex items-center justify-between w-full px-0.5 leading-none">
        <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400">
          {start}..{end}
        </span>
        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
          ▶
        </span>
      </div>

      {/* Center: Symbol & Multiplier */}
      <div className="flex items-center gap-0.5 leading-none">
        <span className="font-mono text-xs font-bold">{symbol}</span>
        <span className="text-[10px] font-mono font-semibold opacity-75">×{count}</span>
      </div>

      {/* Bottom text or expand hint */}
      {density === 'standard' && (
        <span className="text-[8px] font-mono text-slate-400 truncate max-w-full px-0.5">
          {busDataText || (lang === 'zh' ? '点击展开' : 'Expand')}
        </span>
      )}
    </button>
  );
};
