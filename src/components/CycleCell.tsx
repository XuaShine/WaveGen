import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EditorTool, CellDensity } from '../types';
import {
  Tag,
  Check,
  X,
  Copy,
  ClipboardPaste,
  ArrowRight,
  Zap,
  Clock,
  Layers,
  Trash2,
} from 'lucide-react';

interface CycleCellProps {
  symbol: string;
  cycleIndex: number;
  totalCycles?: number;
  nodeTag?: string;
  busDataText?: string;
  activeTool?: EditorTool;
  prevEffectiveSymbol?: string;
  copiedSymbol?: string | null;
  activeBrush?: string | null;
  isMouseDown?: boolean;
  density?: CellDensity;
  onChange: (newSymbol: string) => void;
  onSetNodeTag: (tag: string) => void;
  onCopyState?: (symbol: string) => void;
  onPasteState?: () => void;
  onFillToEnd?: (symbol: string) => void;
  onSetBrush?: (symbol: string) => void;
  onMouseEnterWithMouse?: () => void;
  isExternalHovered?: boolean;
  isLocked?: boolean;
  onHoverCycle?: (cycle: number | null) => void;
  onLockCycle?: (cycle: number | null) => void;
}

// Global persistent clipboard for zero-failure copy & paste across signals & sessions
let memoryClipboardSymbol: string = '0';
try {
  const saved = localStorage.getItem('wavedrom_clipboard_symbol');
  if (saved) memoryClipboardSymbol = saved;
} catch {
  // Ignore storage errors in restricted contexts
}

export const CycleCell: React.FC<CycleCellProps> = ({
  symbol,
  cycleIndex,
  nodeTag,
  busDataText,
  activeTool = 'select',
  prevEffectiveSymbol,
  copiedSymbol,
  activeBrush,
  isMouseDown,
  density = 'standard',
  onChange,
  onSetNodeTag,
  onCopyState,
  onPasteState,
  onFillToEnd,
  onMouseEnterWithMouse,
  isExternalHovered = false,
  isLocked = false,
  onHoverCycle,
  onLockCycle,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeInputVal, setNodeInputVal] = useState(nodeTag || '');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodeInputVal(nodeTag || '');
  }, [nodeTag]);

  // Robust clamped positioning to prevent clipping off screen in any resolution
  const calculatePosition = (width: number, height: number) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    let top = rect.bottom + 6;
    // If popover goes off the bottom of the window, place above
    if (top + height > window.innerHeight - 10) {
      top = rect.top - height - 6;
    }
    // If it goes off top or bottom, clamp safely
    if (top < 10) top = 10;
    if (top + height > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - height - 10);
    }

    let left = rect.left + rect.width / 2 - width / 2;
    if (left < 10) left = 10;
    if (left + width > window.innerWidth - 10) {
      left = window.innerWidth - width - 10;
    }

    setPopoverPos({ top, left });
  };

  // Close menus on clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
        setShowNodeModal(false);
      }
    };

    if (showPicker || showNodeModal) {
      document.addEventListener('mousedown', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [showPicker, showNodeModal]);

  // Effective copied symbol combining React props, module memory, and localStorage
  const currentClipboardState =
    copiedSymbol ||
    memoryClipboardSymbol ||
    (() => {
      try {
        return localStorage.getItem('wavedrom_clipboard_symbol');
      } catch {
        return null;
      }
    })() ||
    '0';

  const handleTriggerCopy = () => {
    memoryClipboardSymbol = symbol;
    try {
      localStorage.setItem('wavedrom_clipboard_symbol', symbol);
    } catch {
      // ignore
    }
    onCopyState?.(symbol);
    try {
      navigator.clipboard?.writeText(symbol);
    } catch {
      // fallback
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1000);
  };

  const handleTriggerPaste = () => {
    const targetSymbol = currentClipboardState;
    if (targetSymbol) {
      onChange(targetSymbol);
      onPasteState?.();
    }
    setShowPicker(false);
  };

  const handleTriggerFill = () => {
    onFillToEnd?.(symbol);
    setShowPicker(false);
  };

  // Direct keyboard shortcut listener when hovering or focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;

    // Copy / Paste shortcuts
    if ((key === 'c' || key === 'C') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleTriggerCopy();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'C')) {
      e.preventDefault();
      handleTriggerCopy();
      return;
    }
    if ((key === 'v' || key === 'V') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleTriggerPaste();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === 'v' || key === 'V')) {
      e.preventDefault();
      handleTriggerPaste();
      return;
    }
    if (key === 'f' || key === 'F') {
      e.preventDefault();
      handleTriggerFill();
      return;
    }
    if (key === 'Escape') {
      setShowPicker(false);
      setShowNodeModal(false);
      return;
    }

    // Direct symbol shortcuts
    const validSymbols = [
      '0', '1', '.', 'p', 'P', 'n', 'N', '=', 'x', 'X', 'z', 'Z',
      'u', 'd', 'h', 'l', '2', '3', '4', '5', '6', '7', '8', '9', '|',
    ];
    if (validSymbols.includes(key)) {
      e.preventDefault();
      const mapped = key === 'X' ? 'x' : key === 'Z' ? 'z' : key;
      onChange(mapped);
      setShowPicker(false);
    }
  };

  // Global window keyboard handler when mouse is hovering over this cell
  useEffect(() => {
    if (!isHovered) return;
    const onWindowKey = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleTriggerCopy();
      } else if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleTriggerPaste();
      }
    };
    window.addEventListener('keydown', onWindowKey);
    return () => window.removeEventListener('keydown', onWindowKey);
  }, [isHovered, symbol, currentClipboardState]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // If global continuous brush is active, apply immediately on click!
    if (activeBrush) {
      onChange(activeBrush);
      return;
    }

    if (activeTool && activeTool !== 'select') {
      if (activeTool === 'node') {
        calculatePosition(240, 140);
        setShowNodeModal(true);
      } else {
        onChange(activeTool);
      }
      return;
    }

    // Default select mode: open compact right-click/click popover
    calculatePosition(290, 310);
    setShowPicker(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    calculatePosition(290, 310);
    setShowPicker(true);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverCycle?.(cycleIndex);
    if (isMouseDown && activeBrush) {
      onChange(activeBrush);
    }
    if (onMouseEnterWithMouse) {
      onMouseEnterWithMouse();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverCycle?.(null);
  };

  // Visual categorization
  const isBus = symbol === '=' || (symbol >= '2' && symbol <= '9');
  const isClock = symbol === 'p' || symbol === 'P' || symbol === 'n' || symbol === 'N';
  const isHigh = symbol === '1' || symbol === 'h' || symbol === 'H';
  const isLow = symbol === '0' || symbol === 'l' || symbol === 'L';
  const isHold = symbol === '.';
  const isGap = symbol === '|';
  const isZ = symbol === 'z';
  const isX = symbol === 'x';

  // Waveform micro-glyph indicating physical electrical shape
  const getSymbolGlyph = (sym: string) => {
    switch (sym) {
      case 'p':
      case 'P':
        return '⎍';
      case 'n':
      case 'N':
        return '⎎';
      case '1':
      case 'h':
      case 'H':
        return '‾';
      case '0':
      case 'l':
      case 'L':
        return '_';
      case '.':
        return '⋯';
      case '=':
        return '═';
      case 'x':
        return '✕';
      case 'z':
        return '┈';
      case 'u':
        return '↗';
      case 'd':
        return '↘';
      case '|':
        return '┆';
      default:
        if (sym >= '2' && sym <= '9') return '▰';
        return '•';
    }
  };

  // State micro-tag for the bottom-right corner (高电平对应High，低电平对应LOW)
  const getElectricalTag = (sym: string) => {
    switch (sym) {
      case 'p':
      case 'P':
        return 'CLK';
      case 'n':
      case 'N':
        return 'nCLK';
      case '1':
      case 'h':
      case 'H':
        return 'High';
      case '0':
      case 'l':
      case 'L':
        return 'LOW';
      case '.':
        return 'HOLD';
      case '=':
        return 'DATA';
      case 'x':
        return 'X';
      case 'z':
        return 'Hi-Z';
      default:
        if (sym >= '2' && sym <= '9') return `C${sym}`;
        return `#${cycleIndex}`;
    }
  };

  return (
    <div
      className="relative inline-block select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label={`周期 T${cycleIndex}`}
    >
      {/* Node Tag Badge on top of cell with 1-click delete */}
      {nodeTag ? (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center bg-purple-600 rounded-full text-white font-mono text-[9px] font-bold shadow-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              calculatePosition(240, 140);
              setShowNodeModal(true);
            }}
            className="pl-1.5 pr-0.5 py-0.2 hover:bg-purple-700 rounded-l-full flex items-center gap-0.5 cursor-pointer"
            title={`节点标记: [${nodeTag}] (点击修改)`}
          >
            <Tag className="w-2.5 h-2.5" />
            <span>{nodeTag}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSetNodeTag('');
            }}
            className="pr-1 pl-0.5 py-0.2 hover:bg-rose-600 rounded-r-full text-purple-200 hover:text-white cursor-pointer transition-colors border-l border-purple-500/50"
            title={`删除节点标记 [${nodeTag}]`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        /* Hover quick node add button */
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            calculatePosition(240, 140);
            setShowNodeModal(true);
          }}
          className="opacity-0 hover:opacity-100 group-hover:opacity-70 focus:opacity-100 transition-opacity absolute -top-2 left-1/2 -translate-x-1/2 z-[5] px-1 py-0.2 bg-slate-700 hover:bg-purple-600 text-white text-[8px] rounded-full shadow-xs cursor-pointer flex items-center gap-0.5"
          title="为此周期添加节点标记"
        >
          +节点
        </button>
      )}

      {/* Main Cycle Cell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${
          density === 'mini'
            ? 'w-[22px] h-[26px] p-0.5 rounded text-[11px]'
            : density === 'compact'
            ? 'w-[30px] h-[36px] p-0.5 rounded-md'
            : 'w-[38px] h-[48px] p-1 rounded-lg'
        } flex flex-col items-center justify-between transition-all border cursor-pointer select-none whitespace-nowrap overflow-hidden ${
          isLow
            ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            : isHigh
            ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100'
            : isHold
            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400'
            : isClock
            ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100'
            : isBus
            ? 'bg-violet-50/90 dark:bg-violet-950/60 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300 font-bold hover:bg-violet-100'
            : isX
            ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100'
            : isZ
            ? 'bg-zinc-100/90 dark:bg-zinc-800/90 border-zinc-400 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200'
            : isGap
            ? 'bg-slate-200 dark:bg-slate-700 border-dashed border-slate-400 text-slate-600 dark:text-slate-300'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
        } ${
          isLocked
            ? 'ring-2 ring-blue-600 dark:ring-blue-400 shadow-xs'
            : isExternalHovered
            ? 'ring-2 ring-purple-500/80 dark:ring-purple-400/80 shadow-xs'
            : ''
        } ${showPicker ? 'ring-2 ring-blue-500 shadow-md' : ''} ${
          activeBrush
            ? 'hover:ring-2 hover:ring-amber-400 dark:hover:ring-amber-500 hover:bg-amber-50/30'
            : ''
        }`}
        title={`周期 T${cycleIndex}: 状态 [${symbol}] (右键快速设置, C键复制, V键粘贴)`}
      >
        {density === 'mini' ? (
          <span className="font-mono text-xs font-bold leading-none my-auto">{symbol}</span>
        ) : density === 'compact' ? (
          <>
            <div className="flex items-center justify-between w-full px-0.5 leading-none">
              <span className="font-mono text-[11px] font-bold leading-none">{symbol}</span>
              <span className="font-mono text-[8px] opacity-70">{getSymbolGlyph(symbol)}</span>
            </div>
            <span className="text-[7.5px] text-slate-400 font-mono scale-90 leading-none">T{cycleIndex}</span>
          </>
        ) : (
          <>
            {/* Top: Wave Symbol + Miniature Waveform Pulse Glyph */}
            <div className="flex items-center justify-between w-full px-0.5 leading-none">
              <span className="font-mono text-xs font-bold leading-none">{symbol}</span>
              <span className="font-mono text-[10px] opacity-75 font-semibold" title="波形微轮廓">
                {getSymbolGlyph(symbol)}
              </span>
            </div>

            {/* Center: Informative State Micro-Badge */}
            <div className="w-full flex items-center justify-center my-auto overflow-hidden">
              {isBus && busDataText ? (
                <div className="w-full text-center truncate px-0.5" title={busDataText}>
                  <span className="text-[7.5px] font-mono text-violet-700 dark:text-violet-300 font-bold bg-violet-100/80 dark:bg-violet-900/60 px-1 py-0.2 rounded block truncate whitespace-nowrap">
                    {busDataText}
                  </span>
                </div>
              ) : isBus ? (
                <span className="text-[8px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100/80 dark:bg-violet-900/60 px-1 py-0.2 rounded whitespace-nowrap">
                  总线
                </span>
              ) : isClock ? (
                <span className="text-[8px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-1 py-0.2 rounded whitespace-nowrap">
                  {symbol === 'p' ? '时钟' : symbol === 'n' ? '负沿' : '脉冲'}
                </span>
              ) : isHigh ? (
                <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1 py-0.2 rounded whitespace-nowrap">
                  高
                </span>
              ) : isLow ? (
                <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/70 px-1 py-0.2 rounded whitespace-nowrap">
                  低
                </span>
              ) : isHold ? (
                <span className="text-[8px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 px-1 py-0.2 rounded whitespace-nowrap">
                  保持
                </span>
              ) : isX ? (
                <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/60 px-1 py-0.2 rounded whitespace-nowrap">
                  不定
                </span>
              ) : isZ ? (
                <span className="text-[8px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200/90 dark:bg-zinc-700/80 px-1 py-0.2 rounded whitespace-nowrap">
                  高阻
                </span>
              ) : isGap ? (
                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 bg-slate-300/80 dark:bg-slate-600/70 px-1 py-0.2 rounded whitespace-nowrap">
                  阶段
                </span>
              ) : (
                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded whitespace-nowrap">
                  {symbol}
                </span>
              )}
            </div>

            {/* Bottom: Cycle Index T0, T1, ... (clean centered single line) */}
            <div className="w-full flex items-center justify-center border-t border-slate-200/80 dark:border-slate-700/80 pt-0.5">
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono font-medium leading-none">
                T{cycleIndex}
              </span>
            </div>
          </>
        )}
      </button>

      {/* PORTAL: Compact, Clean, Non-Overflowing Context Popover */}
      {showPicker &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 99999,
            }}
            className="w-[290px] p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col gap-2 text-xs text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto"
          >
            {/* Header: Title & Current Status */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  周期 T{cycleIndex}
                </span>
                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold rounded text-[11px]">
                  当前: {symbol}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Efficiency Action Bar: Copy, Paste, Fill */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={handleTriggerCopy}
                className="flex items-center justify-center gap-1 px-1 py-1.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 font-medium text-[11px] shadow-2xs cursor-pointer transition-colors"
                title="复制此周期状态 (快捷键: C)"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-blue-500" />
                    <span>复制 (C)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTriggerPaste}
                className="flex items-center justify-center gap-1 px-1 py-1.5 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 font-medium text-[11px] shadow-2xs cursor-pointer transition-colors"
                title={`粘贴状态 [${currentClipboardState}] (快捷键: V)`}
              >
                <ClipboardPaste className="w-3 h-3 text-indigo-500" />
                <span className="truncate">粘贴 [{currentClipboardState}]</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerFill}
                className="flex items-center justify-center gap-1 px-1 py-1.5 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 font-medium text-[11px] shadow-2xs cursor-pointer transition-colors"
                title="以此状态填充至行末尾 (快捷键: F)"
              >
                <ArrowRight className="w-3 h-3 text-emerald-500" />
                <span>铺满 (F)</span>
              </button>
            </div>

            {/* Section 1: Logic Levels (0, 1, ., |) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-500" /> 基础电平
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { s: '0', name: '低电平', cls: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
                  { s: '1', name: '高电平', cls: 'bg-emerald-500 text-white font-bold' },
                  { s: '.', name: '保持', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold' },
                  { s: '|', name: '缝隙', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
                ].map((item) => (
                  <button
                    key={item.s}
                    type="button"
                    onClick={() => {
                      onChange(item.s);
                      setShowPicker(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-1 rounded border text-center transition-all cursor-pointer ${
                      item.s === symbol
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xs ' + item.cls
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 ' + item.cls
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{item.s}</span>
                    <span className="text-[10.5px] whitespace-nowrap">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Clock & Transitions (p, n, P, N, u, d) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" /> 时钟与沿
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { s: 'p', label: '沿时钟', cls: 'bg-blue-500 text-white font-bold' },
                  { s: 'n', label: '负时钟', cls: 'bg-sky-500 text-white font-bold' },
                  { s: 'P', label: '纯正钟', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold' },
                  { s: 'N', label: '纯负钟', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold' },
                  { s: 'u', label: '上跳沿', cls: 'bg-teal-500 text-white font-bold' },
                  { s: 'd', label: '下跳沿', cls: 'bg-amber-500 text-white font-bold' },
                ].map((item) => (
                  <button
                    key={item.s}
                    type="button"
                    onClick={() => {
                      onChange(item.s);
                      setShowPicker(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-1 rounded border text-center transition-all cursor-pointer ${
                      item.s === symbol
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xs ' + item.cls
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 ' + item.cls
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{item.s}</span>
                    <span className="text-[10.5px] whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Bus & Special States (=, x, z) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-violet-500" /> 总线与特殊态
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { s: '=', label: '总线', cls: 'bg-violet-600 text-white font-bold' },
                  { s: 'x', label: '不定态', cls: 'bg-amber-500 text-white font-bold' },
                  { s: 'z', label: '高阻态', cls: 'bg-zinc-600 text-white font-bold' },
                ].map((item) => (
                  <button
                    key={item.s}
                    type="button"
                    onClick={() => {
                      onChange(item.s);
                      setShowPicker(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-1 rounded border text-center transition-all cursor-pointer ${
                      item.s === symbol
                        ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xs ' + item.cls
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 ' + item.cls
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{item.s}</span>
                    <span className="text-[10.5px] whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Colored Buses Palette (2-9) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                彩色总线 (2~9)
              </span>
              <div className="grid grid-cols-8 gap-1">
                {[
                  { s: '2', color: 'bg-rose-500' },
                  { s: '3', color: 'bg-cyan-600' },
                  { s: '4', color: 'bg-purple-600' },
                  { s: '5', color: 'bg-emerald-600' },
                  { s: '6', color: 'bg-amber-500' },
                  { s: '7', color: 'bg-blue-600' },
                  { s: '8', color: 'bg-slate-700' },
                  { s: '9', color: 'bg-amber-800' },
                ].map((b) => (
                  <button
                    key={b.s}
                    type="button"
                    onClick={() => {
                      onChange(b.s);
                      setShowPicker(false);
                    }}
                    title={`彩色总线 ${b.s}`}
                    className={`h-6 rounded flex items-center justify-center font-mono font-bold text-xs text-white shadow-2xs transition-all cursor-pointer ${b.color} ${
                      b.s === symbol ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'
                    }`}
                  >
                    {b.s}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer: Node Tagging & Quick Shortcuts Note */}
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowPicker(false);
                  calculatePosition(240, 140);
                  setShowNodeModal(true);
                }}
                className="text-purple-600 dark:text-purple-400 text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3 h-3" />
                <span>{nodeTag ? `节点: ${nodeTag}` : '+ 标注节点'}</span>
              </button>
              <span className="text-[10px] text-slate-400 font-mono">
                快捷键: 0 1 . p = C V
              </span>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL: Node Tag Input Modal */}
      {showNodeModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 99999,
            }}
            className="w-60 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl text-xs flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold">
                <Tag className="w-3.5 h-3.5" />
                <span>标注节点 (T{cycleIndex})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNodeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              输入字母标识（a~z），用于绘制时序连线与箭头：
            </p>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={1}
                value={nodeInputVal}
                onChange={(e) => setNodeInputVal(e.target.value)}
                placeholder="a..z"
                className="w-14 px-2 py-1 text-center font-mono text-base font-bold border border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSetNodeTag(nodeInputVal.trim());
                    setShowNodeModal(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  onSetNodeTag(nodeInputVal.trim());
                  setShowNodeModal(false);
                }}
                className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                确定标注
              </button>
              {nodeTag && (
                <button
                  type="button"
                  onClick={() => {
                    onSetNodeTag('');
                    setNodeInputVal('');
                    setShowNodeModal(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 dark:border-rose-800/80 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  title="删除此周期的节点标记"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除节点</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
