import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Type,
  Check,
  Layers,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  WaveformFontConfig,
  DEFAULT_FONT_CONFIG,
  FontSectionConfig,
  HeadFootConfig,
} from '../types';

interface WaveformTypographyModalProps {
  isOpen: boolean;
  onClose: () => void;
  head: HeadFootConfig;
  foot: HeadFootConfig;
  onHeadChange: (head: HeadFootConfig) => void;
  onFootChange: (foot: HeadFootConfig) => void;
  fontConfig: WaveformFontConfig;
  onFontConfigChange: (config: WaveformFontConfig) => void;
}

type TabType = 'text' | 'font';
type SectionKey = 'all' | 'title' | 'signal' | 'bus' | 'footer';

export const WaveformTypographyModal: React.FC<WaveformTypographyModalProps> = ({
  isOpen,
  onClose,
  head,
  foot,
  onHeadChange,
  onFootChange,
  fontConfig,
  onFontConfigChange,
}) => {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [activeSection, setActiveSection] = useState<SectionKey>('signal');

  if (!isOpen) return null;

  const fontSizes = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24];
  const colorPresets = [
    { name: lang === 'zh' ? '暗黑 Slate' : 'Slate', hex: '#0f172a' },
    { name: lang === 'zh' ? '纯黑 Black' : 'Black', hex: '#000000' },
    { name: lang === 'zh' ? '宝石蓝 Blue' : 'Blue', hex: '#2563eb' },
    { name: lang === 'zh' ? '翡翠绿 Emerald' : 'Emerald', hex: '#059669' },
    { name: lang === 'zh' ? '琥珀橙 Amber' : 'Amber', hex: '#d97706' },
    { name: lang === 'zh' ? '暗夜紫 Violet' : 'Violet', hex: '#7c3aed' },
    { name: lang === 'zh' ? '玫瑰红 Rose' : 'Rose', hex: '#e11d48' },
    { name: lang === 'zh' ? '纯白 White' : 'White', hex: '#ffffff' },
    { name: lang === 'zh' ? '灰蓝 Slate 300' : 'Slate 300', hex: '#cbd5e1' },
  ];

  const currentSectionConfig: FontSectionConfig =
    activeSection === 'all'
      ? {
          fontSize: fontConfig.fontSize,
          fontWeight: fontConfig.fontWeight,
          fontFamily: fontConfig.fontFamily,
          customColor: fontConfig.customColor,
          useCustomColor: fontConfig.useCustomColor,
        }
      : fontConfig[activeSection] || {
          fontSize: fontConfig.fontSize,
          fontWeight: fontConfig.fontWeight,
          fontFamily: fontConfig.fontFamily,
          customColor: fontConfig.customColor,
          useCustomColor: fontConfig.useCustomColor,
        };

  const updateCurrentConfig = (partial: Partial<FontSectionConfig>) => {
    if (activeSection === 'all') {
      const nextGlobal = {
        ...fontConfig,
        ...partial,
      };
      const nextSection: FontSectionConfig = {
        fontSize: nextGlobal.fontSize,
        fontWeight: nextGlobal.fontWeight,
        fontFamily: nextGlobal.fontFamily,
        customColor: nextGlobal.customColor,
        useCustomColor: nextGlobal.useCustomColor,
      };
      onFontConfigChange({
        ...nextGlobal,
        title: { ...(fontConfig.title || nextSection), ...partial },
        signal: { ...(fontConfig.signal || nextSection), ...partial },
        bus: { ...(fontConfig.bus || nextSection), ...partial },
        footer: { ...(fontConfig.footer || nextSection), ...partial },
      });
    } else {
      const updatedSection = {
        ...currentSectionConfig,
        ...partial,
      };
      onFontConfigChange({
        ...fontConfig,
        [activeSection]: updatedSection,
      });
    }
  };

  const handleApplyToAll = () => {
    const cur = currentSectionConfig;
    onFontConfigChange({
      fontSize: cur.fontSize,
      fontWeight: cur.fontWeight,
      fontFamily: cur.fontFamily,
      customColor: cur.customColor,
      useCustomColor: cur.useCustomColor,
      title: { ...cur },
      signal: { ...cur },
      bus: { ...cur },
      footer: { ...cur },
    });
  };

  const titlePresets = lang === 'zh'
    ? [
        'SPI 传输时序图 (Mode 0)',
        'I2C 字节写入与应答时序',
        'AXI4 突发读写通道交互',
        'DDR4 突发读写与自动预充电',
        '系统复位与时钟初始化时序',
      ]
    : [
        'SPI Transmission Timing (Mode 0)',
        'I2C Byte Write & ACK Timing',
        'AXI4 Burst Read/Write Channel Transaction',
        'DDR4 Burst Read with Auto-Precharge',
        'System Reset & Clock Init Timing',
      ];

  const footerPresets = lang === 'zh'
    ? [
        '[基准: 1.0 GHz · 1 tick = 1.00 ns]',
        '[建立/保持时间窗口: tSU=2.0ns, tHD=1.5ns]',
        '[SPI 模式 0: CPOL=0, CPHA=0]',
        '[AXI4 突发长度: INCR 4 拍]',
        '[注: 虚线处为内部流水线对齐点]',
      ]
    : [
        '[Ref: 1.0 GHz · 1 tick = 1.00 ns]',
        '[Setup/Hold Window: tSU=2.0ns, tHD=1.5ns]',
        '[SPI Mode 0: CPOL=0, CPHA=0]',
        '[AXI4 Burst: INCR 4 beats]',
        '[Note: Dashed lines mark pipeline alignment]',
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'zh' ? '图文排版与字体配置' : 'Text & Typography'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '集中配置波形图表标题、页脚说明、底部刻度与全图字体样式'
                  : 'Manage diagram titles, footer notes, bottom tocks, and typography styling'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '图表标题与页脚说明' : 'Titles & Footnotes'}</span>
            {(head.text || foot.text) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('font')}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'font'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '波形字体排版与样式' : 'Typography & Styles'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: TITLES & FOOTNOTES */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* Header Title */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{lang === 'zh' ? '波形主标题 (head.text):' : 'Main Title (head.text):'}</span>
                  </label>
                  {head.text && (
                    <button
                      type="button"
                      onClick={() => onHeadChange({ ...head, text: '' })}
                      className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      {lang === 'zh' ? '清空标题' : 'Clear'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={head.text || ''}
                  onChange={(e) => onHeadChange({ ...head, text: e.target.value })}
                  placeholder={lang === 'zh' ? "例如: DDR4 Read Burst Timing with Auto Precharge" : "e.g. DDR4 Read Burst Timing"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {lang === 'zh' ? '常用预设:' : 'Presets:'}
                  </span>
                  {titlePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onHeadChange({ ...head, text: preset })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {lang === 'zh'
                    ? '居中显示在波形图上方，字体大小可在「波形字体排版」的「标题」中微调。'
                    : 'Centered at the top. Font size can be fine-tuned in the Typography tab.'}
                </p>
              </div>

              {/* Footer Note */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{lang === 'zh' ? '页脚说明备注 (foot.text):' : 'Footer Note (foot.text):'}</span>
                  </label>
                  {foot.text && (
                    <button
                      type="button"
                      onClick={() => onFootChange({ ...foot, text: '' })}
                      className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      {lang === 'zh' ? '清空备注' : 'Clear'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={foot.text || ''}
                  onChange={(e) => onFootChange({ ...foot, text: e.target.value })}
                  placeholder={lang === 'zh' ? "例如: [Note: 1 tick = 1.0 ns · tCAS = 14 · tRP = 14]" : "e.g. [Note: 1 tick = 1.0 ns]"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {lang === 'zh' ? '快捷填充:' : 'Quick Presets:'}
                  </span>
                  {footerPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onFootChange({ ...foot, text: preset })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {lang === 'zh'
                    ? '居中显示在波形图底部，用于备注关键时序参数（如建立时间、保持时间、基准频率等）。'
                    : 'Centered at bottom for parameters such as setup/hold time or base frequency.'}
                </p>
              </div>

              {/* Bottom Tock / DDR marks */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'zh' ? '底部标尺刻度 (foot.tock / DDR 双沿)' : 'Bottom Tock Marks (foot.tock)'}
                  </label>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {foot.tock ? (lang === 'zh' ? '已启用' : 'Enabled') : (lang === 'zh' ? '未启用' : 'Disabled')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onFootChange({ ...foot, tock: true })}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                      foot.tock
                        ? 'bg-blue-600 text-white font-bold border-blue-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'zh' ? '在波形底部显示刻度' : 'Show Bottom Tock Marks'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFootChange({ ...foot, tock: false })}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                      !foot.tock
                        ? 'bg-slate-700 text-white font-bold border-slate-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'zh' ? '仅顶部显示刻度' : 'Top Only (No Bottom Tock)'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {lang === 'zh'
                    ? '开启后，波形最下方也会同步绘制拍数编号或细分刻度，极大方便双向观察。'
                    : 'When enabled, ticks are also shown at the bottom edge for easy reference.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & FONT STYLES */}
          {activeTab === 'font' && (
            <div className="space-y-4">
              {/* Section Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t('font_section')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { key: 'all' as SectionKey, label: t('font_section_all') },
                    { key: 'title' as SectionKey, label: t('font_section_title') },
                    { key: 'signal' as SectionKey, label: t('font_section_signal') },
                    { key: 'bus' as SectionKey, label: t('font_section_bus') },
                    { key: 'footer' as SectionKey, label: t('font_section_footer') },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveSection(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border text-center ${
                        activeSection === s.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('font_size')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">
                      {currentSectionConfig.fontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCurrentConfig({ fontSize: Math.max(8, currentSectionConfig.fontSize - 1) })}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentConfig({ fontSize: Math.min(36, currentSectionConfig.fontSize + 1) })}
                      className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateCurrentConfig({ fontSize: size })}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer border ${
                        currentSectionConfig.fontSize === size
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Weight */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t('font_weight')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { label: t('font_weight_normal'), value: '400' as const },
                    { label: t('font_weight_medium'), value: '500' as const },
                    { label: t('font_weight_bold'), value: '700' as const },
                    { label: t('font_weight_black'), value: '900' as const },
                  ].map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => updateCurrentConfig({ fontWeight: w.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border text-center ${
                        currentSectionConfig.fontWeight === w.value
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('font_family')}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'zh' ? '支持等宽、现代无衬线、中文黑体与论文衬线' : 'Monospace, Sans, Chinese & Academic Serif'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {[
                    // 等宽字体
                    { label: 'JetBrains Mono', value: 'jetbrains-mono', sample: '"JetBrains Mono", monospace' },
                    { label: 'Fira Code', value: 'fira-code', sample: '"Fira Code", monospace' },
                    { label: 'Consolas', value: 'consolas', sample: 'Consolas, monospace' },
                    { label: 'Source Code Pro', value: 'source-code-pro', sample: '"Source Code Pro", monospace' },
                    { label: lang === 'zh' ? '通用代码等宽 (Monospace)' : 'System Monospace', value: 'monospace', sample: 'monospace' },
                    // 现代无衬线
                    { label: 'Inter (现代科技)', value: 'inter', sample: '"Inter", sans-serif' },
                    { label: 'Roboto', value: 'roboto', sample: '"Roboto", sans-serif' },
                    { label: 'Segoe UI', value: 'segoe-ui', sample: '"Segoe UI", sans-serif' },
                    { label: 'Arial (工程标准)', value: 'arial', sample: 'Arial, sans-serif' },
                    { label: lang === 'zh' ? '系统默认 (System UI)' : 'System UI', value: 'system-ui', sample: 'system-ui, sans-serif' },
                    // 中文字体
                    { label: lang === 'zh' ? '苹方 / 微软雅黑 / 思源黑体' : 'PingFang / YaHei / Noto', value: 'chinese-sans', sample: '"PingFang SC", "Microsoft YaHei", sans-serif' },
                    // 论文与学术衬线
                    { label: 'Times New Roman (学术论文)', value: 'times', sample: '"Times New Roman", serif' },
                    { label: 'Georgia (出版衬线)', value: 'georgia', sample: 'Georgia, serif' },
                    { label: lang === 'zh' ? '通用衬线 (Serif)' : 'Generic Serif', value: 'serif', sample: 'serif' },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => updateCurrentConfig({ fontFamily: f.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border text-left flex items-center justify-between ${
                        currentSectionConfig.fontFamily === f.value
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate" style={{ fontFamily: f.sample }}>{f.label}</span>
                      {currentSectionConfig.fontFamily === f.value && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Color */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('font_color')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateCurrentConfig({ useCustomColor: false })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${
                        !currentSectionConfig.useCustomColor
                          ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:border-blue-800'
                          : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t('font_color_auto')}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentConfig({ useCustomColor: true })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${
                        currentSectionConfig.useCustomColor
                          ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:border-blue-800'
                          : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t('font_color_custom')}
                    </button>
                  </div>
                </div>

                {currentSectionConfig.useCustomColor && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => updateCurrentConfig({ customColor: c.hex, useCustomColor: true })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                          currentSectionConfig.customColor === c.hex
                            ? 'border-blue-500 scale-110 shadow-xs'
                            : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {currentSectionConfig.customColor === c.hex && (
                          <Check
                            className={`w-3 h-3 ${
                              c.hex === '#ffffff' || c.hex === '#cbd5e1' ? 'text-black' : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={currentSectionConfig.customColor}
                      onChange={(e) => updateCurrentConfig({ customColor: e.target.value, useCustomColor: true })}
                      className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 p-0.5 cursor-pointer bg-transparent ml-auto"
                      title={lang === 'zh' ? '自由拾取色值' : 'Custom color picker'}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            {activeTab === 'font' && (
              <>
                <button
                  type="button"
                  onClick={() => onFontConfigChange(DEFAULT_FONT_CONFIG)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                  title={lang === 'zh' ? '全部恢复默认字体设置' : 'Reset all font settings to default'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('font_reset')}</span>
                </button>
                {activeSection !== 'all' && (
                  <button
                    type="button"
                    onClick={handleApplyToAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                    title={lang === 'zh' ? '将当前配置应用到标题、信号、总线、页脚所有分项' : 'Apply current settings to all sections'}
                  >
                    <Layers className="w-3 h-3" />
                    <span>{lang === 'zh' ? '应用到所有' : 'Apply to All'}</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
