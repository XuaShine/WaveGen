import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WaveDromObject, WaveSkin } from '../types';
import { useI18n } from '../lib/i18n';
import {
  renderWaveToElement,
  getWaveSvgString,
  exportSvgToPngDataUrl,
} from '../lib/wavedromRenderer';
import { AVAILABLE_SKINS, getSkinInfo } from '../lib/skins';
import {
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image,
  AlertCircle,
  Pin,
  Maximize2,
  Minimize2,
  MoveVertical,
  Plus,
  Minus,
  ArrowUpToLine,
  Palette,
  ChevronDown,
  SlidersHorizontal,
  Scan,
  Crosshair,
  Ruler,
  Type,
  Rows,
  Columns,
} from 'lucide-react';

interface WaveformPreviewProps {
  waveJson: WaveDromObject;
  skin?: WaveSkin;
  className?: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  onSkinChange?: (skin: WaveSkin) => void;
  onOpenHeadFootConfig?: () => void;
  onOpenFontModal?: () => void;
  autoFitTrigger?: number;
  hoveredCycle?: number | null;
  onHoverCycleChange?: (cycle: number | null) => void;
  lockedCycle?: number | null;
  onLockCycleChange?: (cycle: number | null) => void;
  timebaseStepNs?: number | null;
  totalCycles?: number;
  fillHeight?: boolean;
  layoutMode?: 'split' | 'stacked';
  onToggleLayoutMode?: () => void;
  splitRatio?: number;
  onSetSplitRatio?: (ratio: number) => void;
}

const HEIGHT_PRESETS = [
  { labelZh: '紧凑 (200px)', labelEn: 'Compact (200px)', value: 200 },
  { labelZh: '标准 (320px)', labelEn: 'Standard (320px)', value: 320 },
  { labelZh: '中等 (440px)', labelEn: 'Medium (440px)', value: 440 },
  { labelZh: '大图 (600px)', labelEn: 'Large (600px)', value: 600 },
  { labelZh: '超大 (800px)', labelEn: 'X-Large (800px)', value: 800 },
];

export const WaveformPreview: React.FC<WaveformPreviewProps> = ({
  waveJson,
  skin = 'default',
  className = '',
  isPinned,
  onTogglePin,
  isCompact,
  onToggleCompact,
  onSkinChange,
  onOpenHeadFootConfig,
  onOpenFontModal,
  autoFitTrigger,
  hoveredCycle,
  onHoverCycleChange,
  lockedCycle,
  onLockCycleChange,
  timebaseStepNs,
  totalCycles,
  fillHeight = false,
  layoutMode,
  onToggleLayoutMode,
  splitRatio,
  onSetSplitRatio,
}) => {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [showSkinMenu, setShowSkinMenu] = useState<boolean>(false);
  const skinButtonRef = useRef<HTMLButtonElement | null>(null);
  const [skinMenuPos, setSkinMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Vertical guideline crosshair & setup/hold differential ruler state
  const [showGuideline, setShowGuideline] = useState<boolean>(true);
  const [localHoverCycle, setLocalHoverCycle] = useState<number | null>(null);
  const [localLockedCycle, setLocalLockedCycle] = useState<number | null>(null);

  const effectiveHoverCycle = hoveredCycle !== undefined ? hoveredCycle : localHoverCycle;
  const effectiveLockedCycle = lockedCycle !== undefined ? lockedCycle : localLockedCycle;

  const [svgMetrics, setSvgMetrics] = useState<{
    svgWidth: number;
    svgHeight: number;
    laneOffsetX: number;
    cycleWidth: number;
  } | null>(null);

  const updateSvgMetrics = useCallback(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const viewBox = svg.viewBox?.baseVal;
    const svgWidth = viewBox && viewBox.width > 0 ? viewBox.width : svg.clientWidth || 800;
    const svgHeight = viewBox && viewBox.height > 0 ? viewBox.height : svg.clientHeight || 400;

    const lanes = svg.querySelector<SVGGElement>('g[id^="lanes"]');
    let laneOffsetX = 60.5;

    // WaveDrom positions the lanes container with an explicit translate(x, y) transform.
    // Crucial fix: Do NOT use lanes.getBoundingClientRect() which includes the text labels (signal names)
    // placed into negative coordinates, shifting calculated laneOffsetX 50-100px to the left!
    if (lanes) {
      const transform = lanes.getAttribute('transform') || '';
      const match = /translate\(\s*([-\d.]+)/.exec(transform);
      if (match) {
        laneOffsetX = parseFloat(match[1]);
      }
    }

    // Check if gmark_0_0 has an offset relative to lanes
    const gmark0 = svg.querySelector<SVGLineElement>('line#gmark_0_0, line[id^="gmark_0_"]');
    if (gmark0 && gmark0.hasAttribute('x1')) {
      const g0x = parseFloat(gmark0.getAttribute('x1') || '0');
      if (!isNaN(g0x) && g0x !== 0) {
        laneOffsetX += g0x;
      }
    }

    // Determine cycle width based on gmark line coordinates if present, or WaveDrom skin config
    let cycleWidth = (skin === 'narrower' ? 10 : skin === 'narrow' ? 20 : 40) * (waveJson.config?.hscale || 1);
    const gmark1 = svg.querySelector<SVGLineElement>('line#gmark_1_0, line[id^="gmark_1_"]');
    if (gmark0 && gmark1) {
      const x0 = parseFloat(gmark0.getAttribute('x1') || '0');
      const x1 = parseFloat(gmark1.getAttribute('x1') || '0');
      if (x1 - x0 >= 4) {
        cycleWidth = x1 - x0;
      }
    } else {
      const marks = Array.from(svg.querySelectorAll('line[id^="gmark_"]'));
      if (marks.length >= 2) {
        const xs = marks
          .map((m) => parseFloat((m as SVGLineElement).getAttribute('x1') || '0'))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);
        const diffs: number[] = [];
        for (let i = 1; i < xs.length; i++) {
          const d = xs[i] - xs[i - 1];
          if (d >= 6) diffs.push(d);
        }
        if (diffs.length > 0) {
          diffs.sort((a, b) => a - b);
          cycleWidth = diffs[Math.floor(diffs.length / 2)];
        }
      }
    }

    setSvgMetrics({
      svgWidth,
      svgHeight,
      laneOffsetX,
      cycleWidth,
    });
  }, [waveJson, skin]);

  // Convert client mouse event to exact SVG viewBox coordinate space
  const getSvgCoordinates = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return null;
    try {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const svgP = pt.matrixTransform(ctm.inverse());
        return { x: svgP.x, y: svgP.y };
      }
    } catch {
      // ignore
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    return { x: mouseX, y: 0 };
  };

  const handleWaveMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showGuideline || !svgMetrics) return;
    const pt = getSvgCoordinates(e);
    if (!pt) return;
    const mouseX = pt.x;
    if (mouseX >= svgMetrics.laneOffsetX) {
      const c = Math.floor((mouseX - svgMetrics.laneOffsetX) / svgMetrics.cycleWidth);
      if (c >= 0 && (totalCycles === undefined || c <= totalCycles + 3)) {
        setLocalHoverCycle(c);
        onHoverCycleChange?.(c);
        return;
      }
    }
    setLocalHoverCycle(null);
    onHoverCycleChange?.(null);
  };

  const handleWaveMouseLeave = () => {
    if (!showGuideline) return;
    setLocalHoverCycle(null);
    onHoverCycleChange?.(null);
  };

  const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showGuideline || !svgMetrics) return;
    const pt = getSvgCoordinates(e);
    if (!pt) return;
    const mouseX = pt.x;
    if (mouseX >= svgMetrics.laneOffsetX) {
      const c = Math.floor((mouseX - svgMetrics.laneOffsetX) / svgMetrics.cycleWidth);
      if (c >= 0) {
        const nextLocked = effectiveLockedCycle === c ? null : c;
        setLocalLockedCycle(nextLocked);
        onLockCycleChange?.(nextLocked);
      }
    }
  };

  const handleToggleSkinMenu = () => {
    if (!showSkinMenu && skinButtonRef.current) {
      const rect = skinButtonRef.current.getBoundingClientRect();
      const menuWidth = 300;
      const menuHeight = 380;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < menuHeight && rect.top > menuHeight;

      let top = placeAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      if (left < 10) left = 10;
      setSkinMenuPos({ top, left });
    }
    setShowSkinMenu(!showSkinMenu);
  };

  // Customizable waveform window height mode with localStorage persistence
  const [customHeight, setCustomHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_preview_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 140 && val <= 1200) return val;
      }
    } catch {
      // ignore
    }
    return 340;
  });
  const [heightMode, setHeightMode] = useState<'fill' | 'custom' | 'auto'>(() => {
    try {
      const savedMode = localStorage.getItem('wavedrom_height_mode');
      if (savedMode === 'fill' || savedMode === 'custom' || savedMode === 'auto') {
        return savedMode;
      }
    } catch {
      // ignore
    }
    return fillHeight ? 'fill' : 'custom';
  });

  useEffect(() => {
    if (fillHeight) {
      try {
        const savedMode = localStorage.getItem('wavedrom_height_mode');
        if (savedMode === 'custom' || savedMode === 'auto') {
          setHeightMode(savedMode);
        } else {
          setHeightMode('fill');
        }
      } catch {
        setHeightMode('fill');
      }
    }
  }, [fillHeight]);

  const updateHeightMode = (mode: 'fill' | 'custom' | 'auto') => {
    setHeightMode(mode);
    try {
      localStorage.setItem('wavedrom_height_mode', mode);
    } catch {}
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSizeMenu, setShowSizeMenu] = useState<boolean>(false);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(false);

  const fitToWidth = useCallback(() => {
    if (!containerRef.current || !viewportRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    let svgNaturalWidth = 0;
    if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
      svgNaturalWidth = svg.viewBox.baseVal.width;
    } else {
      const widthAttr = parseFloat(svg.getAttribute('width') || '0');
      svgNaturalWidth = widthAttr > 0 ? widthAttr : svg.scrollWidth;
    }

    const viewportWidth = viewportRef.current.clientWidth - 48;
    if (svgNaturalWidth > 0 && viewportWidth > 0) {
      const targetZoom = Number((viewportWidth / svgNaturalWidth).toFixed(2));
      const boundedZoom = Math.min(1.2, Math.max(0.18, targetZoom));
      setZoom(boundedZoom);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const res = renderWaveToElement(waveJson, containerRef.current, skin);
    if (!res.success) {
      setRenderError(res.error || 'Failed to render WaveDrom');
    } else {
      setRenderError(null);
      updateSvgMetrics();
      setTimeout(updateSvgMetrics, 50);
    }
  }, [waveJson, skin, updateSvgMetrics]);

  useEffect(() => {
    if (effectiveHoverCycle !== null || effectiveLockedCycle !== null) {
      updateSvgMetrics();
    }
  }, [effectiveHoverCycle, effectiveLockedCycle, updateSvgMetrics]);

  // Respond to autoFitTrigger
  useEffect(() => {
    if (autoFitTrigger && autoFitTrigger > 0) {
      setIsAutoFit(true);
      const timer = setTimeout(() => {
        fitToWidth();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [autoFitTrigger, fitToWidth]);

  // Keep fitted if isAutoFit is enabled
  useEffect(() => {
    if (isAutoFit) {
      const timer = setTimeout(() => {
        fitToWidth();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [waveJson, skin, isAutoFit, fitToWidth]);

  // Re-fit on window resize when isAutoFit is on
  useEffect(() => {
    if (!isAutoFit) return;
    const handleResize = () => {
      fitToWidth();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoFit, fitToWidth]);

  // Persist custom height changes
  useEffect(() => {
    try {
      localStorage.setItem('wavedrom_preview_height', String(customHeight));
    } catch {
      // ignore
    }
  }, [customHeight]);

  // Handle Drag to Resize Window Height
  const handleStartResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startY = e.clientY;
      const initialHeight = viewportRef.current?.clientHeight || customHeight;
      updateHeightMode('custom');

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        const newH = Math.max(140, Math.min(1200, Math.round(initialHeight + delta)));
        setCustomHeight(newH);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [customHeight]
  );

  // Wheel handling: Ctrl/Cmd + Wheel to zoom smoothly, otherwise smooth vertical scrolling
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.max(0.4, Math.min(2.5, Number((z + delta).toFixed(2)))));
      }
    };

    vp.addEventListener('wheel', handleWheel, { passive: false });
    return () => vp.removeEventListener('wheel', handleWheel);
  }, []);

  const handleScrollToTop = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopySvg = () => {
    const svgStr = getWaveSvgString(waveJson, skin) || (containerRef.current ? containerRef.current.innerHTML : '');
    if (svgStr) {
      navigator.clipboard.writeText(svgStr);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    }
  };

  const handleDownloadSvg = () => {
    const svgStr = getWaveSvgString(waveJson, skin) || (containerRef.current ? containerRef.current.innerHTML : '');
    if (!svgStr) return;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveform_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!containerRef.current) return;
    try {
      setIsExportingPng(true);
      const dataUrl = await exportSvgToPngDataUrl(containerRef.current, 2, skin);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `waveform_${skin}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to export PNG:', e);
    } finally {
      setIsExportingPng(false);
    }
  };

  const currentSkinInfo = getSkinInfo(skin);
  const isDarkSkin = currentSkinInfo.category === 'dark';

  // Compute effective render viewport height style
  const effectiveHeightStyle: React.CSSProperties =
    heightMode === 'fill'
      ? { height: '100%', flex: 1, minHeight: '200px' }
      : isCompact
      ? { height: '180px', minHeight: '160px', maxHeight: '180px' }
      : heightMode === 'auto'
      ? { height: 'auto', minHeight: '180px', maxHeight: '85vh' }
      : { height: `${customHeight}px`, minHeight: '140px', maxHeight: `${customHeight}px` };

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden ${
        heightMode === 'fill' ? 'h-full flex-1 min-h-0' : ''
      } ${className}`}
    >
      {/* Top Preview Toolbar: Row 1 (Title, Period Ruler, Text & Typography, Waveform Skin, and Guideline) */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200 shrink-0">
            {t('waveform_title')}
          </span>

          {/* Period Ruler Modal Button */}
          {onOpenHeadFootConfig && (
            <button
              onClick={onOpenHeadFootConfig}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer shrink-0"
              title={lang === 'zh' ? '时基规划与周期标尺配置' : 'Timing Ruler & Timebase'}
            >
              <SlidersHorizontal className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px]">{lang === 'zh' ? '周期标尺' : 'Timing Ruler'}</span>
            </button>
          )}

          {/* Consolidated Text & Typography Modal Button */}
          {onOpenFontModal && (
            <button
              onClick={onOpenFontModal}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors shadow-2xs cursor-pointer shrink-0"
              title={lang === 'zh' ? '图文排版与字体配置：标题、页脚说明、底部双沿刻度及全图字体' : 'Text, titles, foot notes & typography'}
            >
              <Type className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-[11px]">{lang === 'zh' ? '图文与字体' : 'Text & Typography'}</span>
            </button>
          )}

          {/* Waveform Skin Selector Button */}
          {onSkinChange && (
            <div className="relative">
              <button
                ref={skinButtonRef}
                type="button"
                onClick={handleToggleSkinMenu}
                className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
                title={lang === 'zh' ? '波形视觉皮肤风格' : 'Waveform visual skin'}
              >
                <Palette className="w-3 h-3 text-indigo-500 shrink-0" />
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                  style={{ backgroundColor: currentSkinInfo.bgColor }}
                />
                <span className="text-[11px] font-semibold">{lang === 'zh' ? currentSkinInfo.name : currentSkinInfo.enName}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              </button>
            </div>
          )}

          {/* Timing guideline toggle */}
          <button
            type="button"
            onClick={() => setShowGuideline(!showGuideline)}
            className={`p-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              showGuideline
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title={showGuideline ? (lang === 'zh' ? '对齐虚线: 已开启' : 'Crosshair: ON') : (lang === 'zh' ? '对齐虚线: 已关闭' : 'Crosshair: OFF')}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Preview Toolbar: Row 2 (Layout Mode Switcher moved here left-aligned, Height Controls, Pin, Auto-fit, Zoom, and Export Buttons) */}
      <div className="flex items-center justify-between gap-2 px-3 py-1 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/60 shrink-0 overflow-x-auto max-w-full">
        {/* Left: Layout Switcher & Height controls (Left-aligned as requested) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Layout Mode Switcher & Split Ratio Presets (Now on Row 2 left-aligned) */}
          {onToggleLayoutMode && (
            <div className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs text-[11px] font-semibold shrink-0">
              <button
                type="button"
                onClick={onToggleLayoutMode}
                className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded cursor-pointer transition-colors"
                title={layoutMode === 'split' ? (lang === 'zh' ? '点击切为上下堆叠布局' : 'Switch to Stacked View') : (lang === 'zh' ? '点击切为左右分屏布局' : 'Switch to Split View')}
              >
                {layoutMode === 'split' ? (
                  <>
                    <Rows className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>{lang === 'zh' ? '上下视图' : 'Stacked'}</span>
                  </>
                ) : (
                  <>
                    <Columns className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>{lang === 'zh' ? '左右分屏' : 'Split'}</span>
                  </>
                )}
              </button>

              {layoutMode === 'split' && onSetSplitRatio && (
                <div className="flex items-center border-l border-slate-200 dark:border-slate-700 pl-1 gap-0.5 font-mono text-[10px]">
                  {[35, 50, 60, 70].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onSetSplitRatio(preset)}
                      className={`px-1 py-0.5 rounded transition-colors cursor-pointer ${
                        splitRatio !== undefined && Math.round(splitRatio) === preset
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={lang === 'zh' ? `右侧波形占比 ${preset}%` : `Right pane ${preset}%`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Height controls: - [Height] + [Fill Bottom] */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs text-[11px] font-semibold overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => {
                  const currentH = heightMode === 'custom' ? customHeight : (viewportRef.current?.clientHeight || 340);
                  const nextH = Math.max(140, currentH - 40);
                  updateHeightMode('custom');
                  setCustomHeight(nextH);
                }}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none"
                title={lang === 'zh' ? '高度 -40px' : 'Decrease height (-40px)'}
              >
                -
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSizeMenu(!showSizeMenu)}
                  className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={lang === 'zh' ? '点击选择高度预设或直接输入' : 'Select height presets or enter pixels'}
                >
                  <MoveVertical className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                  <span className="font-mono whitespace-nowrap">
                    {heightMode === 'fill' ? t('height_fill') : heightMode === 'auto' ? t('height_auto') : `${customHeight}px`}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                </button>
                {showSizeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSizeMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-1.5 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          updateHeightMode('fill');
                          setShowSizeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs ${
                          heightMode === 'fill'
                            ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-slate-700/60'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>↕️</span>
                          <span>{t('height_fill')}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{lang === 'zh' ? '占满底部' : 'Full Height'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateHeightMode('auto');
                          setShowSizeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs ${
                          heightMode === 'auto'
                            ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-slate-700/60'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📐</span>
                          <span>{t('height_auto')}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{lang === 'zh' ? '随内容' : 'Fit Content'}</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {lang === 'zh' ? '常用高度预设' : 'Height Presets'}
                      </div>
                      <div className="grid grid-cols-3 gap-1 px-2 py-1">
                        {[240, 320, 400, 500, 640, 800].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              updateHeightMode('custom');
                              setCustomHeight(h);
                              setShowSizeMenu(false);
                            }}
                            className={`px-2 py-1 rounded text-center font-mono text-xs cursor-pointer transition-colors ${
                              heightMode === 'custom' && customHeight === h
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {h}px
                          </button>
                        ))}
                      </div>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                      <div className="px-3 py-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">{lang === 'zh' ? '自定义像素' : 'Custom px'}:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="140"
                            max="1600"
                            step="20"
                            value={customHeight}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 340;
                              updateHeightMode('custom');
                              setCustomHeight(val);
                            }}
                            className="w-16 px-1.5 py-0.5 font-mono text-xs text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                          />
                          <span className="text-[11px] text-slate-400">px</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentH = heightMode === 'custom' ? customHeight : (viewportRef.current?.clientHeight || 340);
                  const nextH = Math.min(1600, currentH + 40);
                  updateHeightMode('custom');
                  setCustomHeight(nextH);
                }}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer select-none"
                title={lang === 'zh' ? '高度 +40px' : 'Increase height (+40px)'}
              >
                +
              </button>
            </div>

            {/* Direct Fill Bottom Toggle Button */}
            <button
              type="button"
              onClick={() => updateHeightMode(heightMode === 'fill' ? 'custom' : 'fill')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs shrink-0 ${
                heightMode === 'fill'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title={heightMode === 'fill' ? (lang === 'zh' ? '点击退出撑满，恢复自定义高度' : 'Click to exit fill mode') : (lang === 'zh' ? '点击撑满底部空间' : 'Fill height')}
            >
              <span>{t('height_fill')}</span>
            </button>
          </div>
        </div>

        {/* Right: Actions, Zoom, Export buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded-md transition-colors border shadow-2xs cursor-pointer shrink-0 ${
                isPinned
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title={isPinned ? (lang === 'zh' ? '取消吸顶固定' : 'Unpin') : (lang === 'zh' ? '吸顶常驻固定' : 'Pin to top')}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = !isAutoFit;
              setIsAutoFit(next);
              if (next) {
                fitToWidth();
              } else {
                setZoom(1);
              }
            }}
            className={`p-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              isAutoFit
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title={isAutoFit ? (lang === 'zh' ? '适应宽度: 开' : 'Auto Fit: ON') : (lang === 'zh' ? '适应宽度: 关' : 'Auto Fit: OFF')}
          >
            <Scan className="w-3.5 h-3.5" />
          </button>

          {/* Zoom segment */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 p-0.5 text-xs text-slate-600 dark:text-slate-300 shrink-0">
            <button
              onClick={() => {
                setIsAutoFit(false);
                setZoom((z) => Math.max(0.2, Number((z - 0.15).toFixed(2))));
              }}
              title={t('zoom_out')}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 font-mono text-[10px] min-w-[28px] text-center select-none font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                setIsAutoFit(false);
                setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
              }}
              title={t('zoom_in')}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setIsAutoFit(false);
                setZoom(1);
              }}
              title={t('zoom_reset')}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border-l border-slate-200 dark:border-slate-700 ml-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleScrollToTop}
              title={lang === 'zh' ? '滚到顶部' : 'Scroll to top'}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border-l border-slate-200 dark:border-slate-700 ml-0.5 text-blue-600 cursor-pointer"
            >
              <ArrowUpToLine className="w-2.5 h-2.5" />
            </button>
          </div>

          <button
            onClick={handleCopySvg}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
            title={copiedSvg ? t('copied') : t('copy_svg')}
          >
            {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadSvg}
            className="px-2 py-0.5 text-[11px] font-semibold rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
            title={t('download_svg')}
          >
            SVG
          </button>

          <button
            onClick={handleDownloadPng}
            disabled={isExportingPng}
            className="px-2 py-0.5 text-[11px] font-semibold rounded-md text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
            title={t('download_png')}
          >
            {isExportingPng ? '...' : 'PNG'}
          </button>
        </div>
      </div>

      {/* Render Error Warning */}
      {renderError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{lang === 'zh' ? `波形渲染警告: ${renderError}` : `Waveform Render Warning: ${renderError}`}</span>
        </div>
      )}

      {/* Main SVG Render Container with Dynamic Height, Custom Sizing and Smooth Scroll */}
      <div
        ref={viewportRef}
        data-skin={skin}
        style={{
          ...effectiveHeightStyle,
          backgroundColor: currentSkinInfo.bgColor,
        }}
        className={`relative overflow-auto p-4 md:p-6 transition-[height,background-color] duration-150 select-none skin-${skin} ${
          heightMode === 'fill' ? 'flex-1 min-h-0' : ''
        }`}
      >
        {/* Floating Alignment Guideline Status Bar */}
        {showGuideline && effectiveLockedCycle !== null && (
          <div className="sticky top-2 left-4 z-30 inline-flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-200 dark:border-blue-800 text-xs shadow-lg animate-in fade-in duration-100">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
              📍 {lang === 'zh' ? '基准上升沿' : 'Ref Edge'}: T{effectiveLockedCycle}
            </span>
            {effectiveHoverCycle !== null && effectiveHoverCycle !== effectiveLockedCycle && (
              <span className="text-purple-700 dark:text-purple-300 font-mono font-medium">
                · {lang === 'zh' ? '比对采样点' : 'Sample Point'}: T{effectiveHoverCycle} (Δ = {effectiveHoverCycle - effectiveLockedCycle > 0 ? '+' : ''}{effectiveHoverCycle - effectiveLockedCycle} {lang === 'zh' ? '拍' : 'cycles'}
                {timebaseStepNs ? ` / ${(Math.abs(effectiveHoverCycle - effectiveLockedCycle) * timebaseStepNs).toFixed(2)}ns` : ''})
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setLocalLockedCycle(null);
                onLockCycleChange?.(null);
              }}
              className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-rose-100 hover:text-rose-700 rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
            >
              {lang === 'zh' ? '解除基准锁定' : 'Unlock Ref'}
            </button>
          </div>
        )}

        <div className="min-w-fit min-h-full flex flex-col items-center justify-start pt-2 pb-6 m-auto">
          <div
            className={`transition-transform duration-75 origin-top inline-block relative ${
              showGuideline ? 'cursor-crosshair' : ''
            }`}
            style={{ transform: `scale(${zoom})` }}
            onMouseMove={handleWaveMouseMove}
            onMouseLeave={handleWaveMouseLeave}
            onClick={handleWaveClick}
          >
            {/* WaveDrom mounts SVG directly here */}
            <div
              ref={containerRef}
              id="waveform_container_svg"
              data-skin={skin}
              className={`wavedrom-render-host select-none filter drop-shadow-xs skin-${skin}`}
            />

            {/* Interactive Vertical Timing Alignment & Cross-Clock Domain Guideline Overlay */}
            {showGuideline && svgMetrics && (effectiveHoverCycle !== null || effectiveLockedCycle !== null) && (
              <svg
                className="absolute inset-0 pointer-events-none z-20"
                width={svgMetrics.svgWidth}
                height={svgMetrics.svgHeight}
                viewBox={`0 0 ${svgMetrics.svgWidth} ${svgMetrics.svgHeight}`}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <marker
                    id="guideline-arrow-left"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 10 0 L 0 5 L 10 10 z" fill="#8b5cf6" />
                  </marker>
                  <marker
                    id="guideline-arrow-right"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
                  </marker>
                </defs>

                {/* Differential setup/hold measurement span between locked cycle and hover cycle */}
                {effectiveLockedCycle !== null && effectiveHoverCycle !== null && effectiveLockedCycle !== effectiveHoverCycle && (() => {
                  const minC = Math.min(effectiveLockedCycle, effectiveHoverCycle);
                  const maxC = Math.max(effectiveLockedCycle, effectiveHoverCycle);
                  const spanX = svgMetrics.laneOffsetX + minC * svgMetrics.cycleWidth;
                  const spanW = (maxC - minC) * svgMetrics.cycleWidth;
                  const deltaCycles = effectiveHoverCycle - effectiveLockedCycle;
                  const deltaNs = timebaseStepNs ? (deltaCycles * timebaseStepNs).toFixed(2) : null;
                  const textLabel = `Δ = ${deltaCycles > 0 ? '+' : ''}${deltaCycles} ${lang === 'zh' ? '拍' : 'cycles'}${deltaNs ? ` (${deltaNs} ns)` : ''}`;

                  return (
                    <g className="timing-span-measurement">
                      {/* Transparent shaded span background */}
                      <rect
                        x={spanX}
                        y={0}
                        width={spanW}
                        height={svgMetrics.svgHeight}
                        fill="rgba(139, 92, 246, 0.10)"
                        stroke="none"
                      />

                      {/* Differential measurement arrow ruler line */}
                      <line
                        x1={spanX + 6}
                        y1={24}
                        x2={spanX + spanW - 6}
                        y2={24}
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        markerStart="url(#guideline-arrow-left)"
                        markerEnd="url(#guideline-arrow-right)"
                      />

                      {/* Floating measurement badge */}
                      <g transform={`translate(${spanX + spanW / 2}, 24)`}>
                        <rect
                          x="-50"
                          y="-11"
                          width="100"
                          height="20"
                          rx="5"
                          fill="#7c3aed"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="3"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {textLabel}
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* Locked Reference Line (Pinned Anchor) */}
                {effectiveLockedCycle !== null && (() => {
                  const x = svgMetrics.laneOffsetX + effectiveLockedCycle * svgMetrics.cycleWidth;
                  return (
                    <g className="locked-timing-line">
                      <rect
                        x={x}
                        y={0}
                        width={svgMetrics.cycleWidth}
                        height={svgMetrics.svgHeight}
                        fill="rgba(37, 99, 235, 0.12)"
                      />
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={svgMetrics.svgHeight}
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeDasharray="6 3"
                      />
                      <g transform={`translate(${x}, 5)`}>
                        <rect
                          x="-26"
                          y="0"
                          width="52"
                          height="18"
                          rx="4"
                          fill="#1d4ed8"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="13"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          📍 T{effectiveLockedCycle}
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* Hover Timing Line */}
                {effectiveHoverCycle !== null && effectiveHoverCycle !== effectiveLockedCycle && (() => {
                  const x = svgMetrics.laneOffsetX + effectiveHoverCycle * svgMetrics.cycleWidth;
                  return (
                    <g className="hover-timing-line">
                      <rect
                        x={x}
                        y={0}
                        width={svgMetrics.cycleWidth}
                        height={svgMetrics.svgHeight}
                        fill="rgba(147, 51, 234, 0.12)"
                      />
                      {/* Crisp vertical alignment dashed line */}
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={svgMetrics.svgHeight}
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeDasharray="5 3"
                      />
                      {/* Top badge */}
                      <g transform={`translate(${x}, 4)`}>
                        <rect
                          x="-32"
                          y="0"
                          width="64"
                          height="19"
                          rx="4"
                          fill="#7e22ce"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                        <text
                          x="0"
                          y="13"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          ↑ T{effectiveHoverCycle} {lang === 'zh' ? '沿' : 'Edge'}
                        </text>
                      </g>
                      {/* Bottom badge */}
                      {svgMetrics.svgHeight > 120 && (
                        <g transform={`translate(${x}, ${svgMetrics.svgHeight - 23})`}>
                          <rect
                            x="-22"
                            y="0"
                            width="44"
                            height="18"
                            rx="4"
                            fill="#7e22ce"
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="13"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            T{effectiveHoverCycle}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Bottom Resize Handle (when not fill height) */}
      {heightMode !== 'fill' && (
        <div
          onMouseDown={handleStartResize}
          onDoubleClick={() => updateHeightMode(heightMode === 'auto' ? 'custom' : 'auto')}
          className={`h-3 w-full bg-slate-50 hover:bg-blue-500/20 active:bg-blue-600/30 dark:bg-slate-900/90 dark:hover:bg-blue-500/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-row-resize select-none transition-colors group relative shrink-0 ${
            isDragging ? 'bg-blue-500/20 ring-1 ring-blue-500/30' : ''
          }`}
          title={lang === 'zh' ? '上下拖拽调节波形高度，双击切换自适应' : 'Drag up/down to adjust waveform height, double-click for auto'}
        >
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 transition-colors" />
          {isDragging && (
            <div className="absolute -top-7 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono shadow-md z-30 pointer-events-none">
              {customHeight}px
            </div>
          )}
        </div>
      )}

      {/* Skin selection floating portal menu */}
      {showSkinMenu && onSkinChange && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-50 bg-black/10 backdrop-blur-2xs"
            onClick={() => setShowSkinMenu(false)}
          />
          <div
            style={{ top: `${skinMenuPos.top}px`, left: `${skinMenuPos.left}px` }}
            className="fixed z-50 w-72 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2 py-1 mb-1 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              {lang === 'zh' ? '选择波形皮肤风格' : 'Select Waveform Skin'}
            </div>
            <div className="space-y-1">
              {AVAILABLE_SKINS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSkinChange(s.id);
                    setShowSkinMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs ${
                    skin === s.id
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs"
                      style={{ backgroundColor: s.bgColor }}
                    />
                    <div>
                      <div className="font-medium truncate">{lang === 'zh' ? s.name : s.enName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
                    </div>
                  </div>
                  {skin === s.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
