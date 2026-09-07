import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WaveDromObject, WaveSkin } from '../types';
import { useI18n } from '../lib/i18n';
import {
  renderWaveToElement,
  getWaveSvgString,
  exportSvgToPngDataUrl,
} from '../lib/wavedromRenderer';
import { getSkinInfo } from '../lib/skins';
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
  onHeightChange?: (height: number, totalPreviewHeight?: number) => void;
  onToggleFillHeight?: (isFill: boolean) => void;
  isExternalDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

const HEIGHT_PRESETS = [
  { labelZh: '紧凑 (220px)', labelEn: 'Compact (220px)', value: 220 },
  { labelZh: '标准 (320px)', labelEn: 'Standard (320px)', value: 320 },
  { labelZh: '舒适 (420px)', labelEn: 'Comfort (420px)', value: 420 },
  { labelZh: '扩展 (540px)', labelEn: 'Expanded (540px)', value: 540 },
  { labelZh: '大图 (700px)', labelEn: 'Large (700px)', value: 700 },
  { labelZh: '超大 (900px)', labelEn: 'X-Large (900px)', value: 900 },
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
  onHeightChange,
  onToggleFillHeight,
  isExternalDragging = false,
  onDragStateChange,
}) => {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

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
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // User Request: 自动调节展示范围，波形自动上下居中展示核心内容，消除顶部多余空白
  const fitToView = useCallback((containHeight = true) => {
    if (!containerRef.current || !viewportRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    let svgNaturalWidth = 0;
    let svgNaturalHeight = 0;
    if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
      svgNaturalWidth = svg.viewBox.baseVal.width;
      svgNaturalHeight = svg.viewBox.baseVal.height;
    } else {
      const widthAttr = parseFloat(svg.getAttribute('width') || '0');
      const heightAttr = parseFloat(svg.getAttribute('height') || '0');
      svgNaturalWidth = widthAttr > 0 ? widthAttr : svg.scrollWidth;
      svgNaturalHeight = heightAttr > 0 ? heightAttr : svg.scrollHeight;
    }

    // Precise padding allowance (tight minimal margins so waveform fills preview and centers nicely)
    const viewportWidth = Math.max(80, viewportRef.current.clientWidth - 16);
    const viewportHeight = Math.max(80, viewportRef.current.clientHeight - 16);

    if (svgNaturalWidth > 0 && svgNaturalHeight > 0 && viewportWidth > 0 && viewportHeight > 0) {
      const zoomW = viewportWidth / svgNaturalWidth;
      const zoomH = viewportHeight / svgNaturalHeight;
      // When containHeight is true, adapt to fit BOTH all signals vertically and all cycles horizontally!
      const targetZoom = containHeight ? Math.min(zoomW, zoomH) : zoomW;
      const boundedZoom = Math.min(1.6, Math.max(0.2, Number(targetZoom.toFixed(2))));
      setZoom(boundedZoom);

      // Smoothly center the core content vertically and horizontally in the visible viewport
      const centerScroll = () => {
        if (viewportRef.current) {
          const vp = viewportRef.current;
          const targetTop = Math.max(0, Math.round((vp.scrollHeight - vp.clientHeight) / 2));
          const targetLeft = Math.max(0, Math.round((vp.scrollWidth - vp.clientWidth) / 2));
          vp.scrollTo({
            top: targetTop,
            left: targetLeft,
            behavior: 'smooth',
          });
        }
      };
      requestAnimationFrame(centerScroll);
      setTimeout(centerScroll, 60);
    }
  }, []);

  const fitToWidth = useCallback(() => {
    fitToView(false);
  }, [fitToView]);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsRendering(true);
    const res = renderWaveToElement(waveJson, containerRef.current, skin);
    if (!res.success) {
      setRenderError(res.error || 'Failed to render WaveDrom');
    } else {
      setRenderError(null);
      updateSvgMetrics();
      setTimeout(updateSvgMetrics, 50);
    }
    const timer = setTimeout(() => setIsRendering(false), 120);
    return () => clearTimeout(timer);
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
        fitToView(true);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [autoFitTrigger, fitToView]);

  // Keep fitted adaptively if isAutoFit is enabled
  useEffect(() => {
    if (isAutoFit) {
      const timer = setTimeout(() => {
        fitToView(true);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [waveJson, skin, isAutoFit, fitToView]);

  // Re-fit on window resize or viewport container resize when isAutoFit is on
  useEffect(() => {
    if (!isAutoFit) return;
    const handleResize = () => {
      fitToView(true);
    };
    window.addEventListener('resize', handleResize);

    // Watch viewport container dimensions directly (handles splitter drag, edge editor drag, etc.)
    let ro: ResizeObserver | null = null;
    if (viewportRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        fitToView(true);
      });
      ro.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [isAutoFit, fitToView]);

  // Re-fit adaptively when customHeight or heightMode changes
  useEffect(() => {
    if (isAutoFit) {
      const timer = setTimeout(() => {
        fitToView(true);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [customHeight, heightMode, isAutoFit, fitToView]);

  // Persist custom height changes
  useEffect(() => {
    try {
      localStorage.setItem('wavedrom_preview_height', String(customHeight));
    } catch {
      // ignore
    }
  }, [customHeight]);

  // Handle Drag to Resize Window Height (Smooth 60fps with direct DOM styling and RAF)
  const handleStartResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      onDragStateChange?.(true);
      const startY = e.clientY;
      const initialHeight = viewportRef.current?.clientHeight || customHeight;
      updateHeightMode('custom');

      let currentH = initialHeight;
      let rafId: number | null = null;

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        currentH = Math.max(140, Math.min(1600, Math.round(initialHeight + delta)));

        if (viewportRef.current) {
          viewportRef.current.style.height = `${currentH}px`;
        }

        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            setCustomHeight(currentH);
            const totalComponentH = previewRootRef.current
              ? previewRootRef.current.getBoundingClientRect().height
              : currentH + 84;
            onHeightChange?.(currentH, totalComponentH);
            rafId = null;
          });
        }
      };

      const onMouseUp = () => {
        setIsDragging(false);
        onDragStateChange?.(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        setCustomHeight(currentH);
        const totalComponentH = previewRootRef.current
          ? previewRootRef.current.getBoundingClientRect().height
          : currentH + 84;
        onHeightChange?.(currentH, totalComponentH);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [customHeight, onDragStateChange, onHeightChange]
  );

  // Wheel handling: Ctrl/Cmd + Wheel to zoom smoothly, otherwise smooth vertical scrolling
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Crucial: Deactivate auto-fit immediately so container ResizeObserver doesn't snap back or shrink zoom
        setIsAutoFit(false);
        // Correct zoom direction: deltaY < 0 (scrolling up/pinch out) = Zoom In (+); deltaY > 0 (scrolling down/pinch in) = Zoom Out (-)
        const step = Math.abs(e.deltaY) > 50 ? 0.12 : 0.06;
        const delta = e.deltaY < 0 ? step : -step;
        setZoom((z) => Math.max(0.2, Math.min(3.0, Number((z + delta).toFixed(2)))));
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

  // User Request: 改成点击613px这一块切换高度
  const handleCycleNextHeight = () => {
    updateHeightMode('custom');
    const presetValues = HEIGHT_PRESETS.map((p) => p.value);
    const currentH = viewportRef.current?.clientHeight || (heightMode === 'custom' ? customHeight : 320);
    // Find next preset strictly greater than current, or wrap around
    const nextVal = presetValues.find((v) => v > currentH) ?? presetValues[0];
    setCustomHeight(nextVal);
    onHeightChange?.(nextVal);
    if (isAutoFit) {
      setTimeout(() => fitToView(true), 60);
    }
  };

  const currentSkinInfo = getSkinInfo(skin);
  const isDarkSkin = currentSkinInfo.category === 'dark';

  // Compute effective render viewport height style
  const effectiveHeightStyle: React.CSSProperties =
    heightMode === 'fill'
      ? { height: '100%', flex: 1, minHeight: '140px' }
      : isCompact
      ? { height: '180px', minHeight: '160px', maxHeight: '180px' }
      : heightMode === 'auto'
      ? { height: 'auto', minHeight: '180px', maxHeight: '85vh' }
      : { height: `${customHeight}px`, minHeight: '140px', maxHeight: `${customHeight}px` };

  // Smooth animation transition style (zero lag when actively dragging either panel)
  const viewportTransitionStyle: React.CSSProperties = isDragging || isExternalDragging
    ? { transition: 'none' }
    : { transition: 'height 240ms cubic-bezier(0.16, 1, 0.3, 1), max-height 240ms cubic-bezier(0.16, 1, 0.3, 1)' };

  return (
    <div
      ref={previewRootRef}
      className={`flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden ${
        heightMode === 'fill' ? 'h-full flex-1 min-h-0' : ''
      } ${className}`}
    >
      {/* Top Preview Toolbar: Row 1 (Title, Period Ruler, Text & Typography, and Crosshair) */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200 shrink-0">
            {t('waveform_title')}
          </span>
        </div>

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

      {/* Top Preview Toolbar: Row 2 (From 上下视图 through PNG, Dedicated Line) */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/60 shrink-0 overflow-x-auto select-none">
        {/* Layout Mode Switcher & Split Ratio Presets */}
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
            <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs text-[11px] font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  const currentH = viewportRef.current?.clientHeight || (heightMode === 'custom' ? customHeight : 340);
                  const nextH = Math.max(140, currentH - 40);
                  updateHeightMode('custom');
                  setCustomHeight(nextH);
                  onHeightChange?.(nextH);
                }}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none rounded-l-md"
                title={lang === 'zh' ? '高度 -40px' : 'Decrease height (-40px)'}
              >
                -
              </button>
              {/* User Request: 改成点击613px这一块切换高度，去掉高度预设下拉按钮 */}
              <button
                type="button"
                onClick={handleCycleNextHeight}
                className="flex items-center gap-1 px-2.5 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                title={
                  lang === 'zh'
                    ? `点击直接切换高度预设 (当前: ${
                        heightMode === 'fill' ? t('height_fill') : heightMode === 'auto' ? t('height_auto') : `${viewportRef.current?.clientHeight || customHeight}px`
                      })`
                    : `Click to switch to next height preset`
                }
              >
                <MoveVertical className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                <span className="font-mono whitespace-nowrap font-bold">
                  {viewportRef.current?.clientHeight
                    ? `${viewportRef.current.clientHeight}px`
                    : heightMode === 'fill'
                    ? t('height_fill')
                    : heightMode === 'auto'
                    ? t('height_auto')
                    : `${customHeight}px`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentH = viewportRef.current?.clientHeight || (heightMode === 'custom' ? customHeight : 340);
                  const nextH = Math.min(1600, currentH + 40);
                  updateHeightMode('custom');
                  setCustomHeight(nextH);
                  onHeightChange?.(nextH);
                }}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 cursor-pointer select-none rounded-r-md"
                title={lang === 'zh' ? '高度 +40px' : 'Increase height (+40px)'}
              >
                +
              </button>
            </div>

            {/* Direct Fill Bottom Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = heightMode === 'fill' ? 'custom' : 'fill';
                updateHeightMode(nextMode);
                onToggleFillHeight?.(nextMode === 'fill');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs shrink-0 ${
                heightMode === 'fill'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title={heightMode === 'fill' ? (lang === 'zh' ? '点击退出撑满，恢复与标注面板协同' : 'Click to exit fill mode') : (lang === 'zh' ? '点击撑满底部空间 (标注面板吸底收起)' : 'Fill height (capsule annotations)')}
            >
              <span>{t('height_fill')}</span>
            </button>
          </div>

        {/* Actions, Zoom, Export buttons - left-aligned next to Fill Bottom */}
        <div className="flex items-center gap-1 shrink-0">
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
                fitToView(true);
              }
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs shrink-0 ${
              isAutoFit
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400/40'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title={
              isAutoFit
                ? (lang === 'zh'
                    ? '全景自适应: 已开启 (波形高宽自适应调节，所有信号完整自适应居中显示)'
                    : 'Auto Fit: ON (All signals & cycles adaptively centered in view)')
                : (lang === 'zh'
                    ? '全景自适应: 已关闭 (点击一键自适应，使全部信号完整居中显示)'
                    : 'Auto Fit: OFF (Click to adaptively center all signals in view)')
            }
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">{lang === 'zh' ? '全景自适应' : 'Fit All'}</span>
            {isAutoFit && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
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
          ...viewportTransitionStyle,
          backgroundColor: currentSkinInfo.bgColor,
        }}
        className={`relative overflow-auto p-1.5 sm:p-2.5 select-none skin-${skin} ${
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

        {/* Waveform Dynamic Visual Centering (Suggestion 3: vertical centering if small, top-aligned with scroll if tall) */}
        {(() => {
          const isTaller = Boolean(
            svgMetrics && viewportRef.current &&
            (svgMetrics.svgHeight * zoom) > (viewportRef.current.clientHeight - 20)
          );
          return (
            <div className={`min-w-full min-h-full flex p-0 m-auto ${
              isTaller ? 'items-center justify-start flex-col pt-2' : 'items-center justify-center'
            }`}>
              <div
                className={`relative m-auto shrink-0 ${
                  isDragging || isExternalDragging ? '' : 'transition-[width,height] duration-150 ease-out'
                }`}
                style={{
                  width: svgMetrics?.svgWidth ? `${Math.round(svgMetrics.svgWidth * zoom)}px` : 'auto',
                  height: svgMetrics?.svgHeight ? `${Math.round(svgMetrics.svgHeight * zoom)}px` : 'auto',
                }}
              >
            <div
              className={`absolute top-0 left-0 origin-top-left select-none ${
                isDragging || isExternalDragging ? '' : 'transition-transform duration-150 ease-out'
              } ${showGuideline ? 'cursor-crosshair' : ''}`}
              style={{
                width: svgMetrics?.svgWidth ? `${svgMetrics.svgWidth}px` : 'auto',
                height: svgMetrics?.svgHeight ? `${svgMetrics.svgHeight}px` : 'auto',
                transform: `scale(${zoom})`,
              }}
              onMouseMove={handleWaveMouseMove}
              onMouseLeave={handleWaveMouseLeave}
              onClick={handleWaveClick}
            >
              {/* WaveDrom mounts SVG directly here */}
              <div
                ref={containerRef}
                id="waveform_container_svg"
                data-skin={skin}
                className={`wavedrom-render-host select-none filter drop-shadow-xs skin-${skin} transition-opacity duration-150 ${
                  isRendering ? 'opacity-60' : 'opacity-100'
                }`}
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
      );
    })()}
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
    </div>
  );
};
