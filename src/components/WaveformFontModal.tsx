import React, { useState } from 'react';
import { X, RotateCcw, Type, Check, Layers } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { WaveformFontConfig, DEFAULT_FONT_CONFIG, FontSectionConfig } from '../types';

export type { WaveformFontConfig };
export { DEFAULT_FONT_CONFIG };

interface WaveformFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WaveformFontConfig;
  onChange: (config: WaveformFontConfig) => void;
}

type SectionKey = 'all' | 'title' | 'signal' | 'bus' | 'footer';

export const WaveformFontModal: React.FC<WaveformFontModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  const { t, lang } = useI18n();
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
    { name: lang === 'zh' ? '高对比纯白 White' : 'White', hex: '#ffffff' },
    { name: lang === 'zh' ? '灰蓝 Slate 300' : 'Slate 300', hex: '#cbd5e1' },
  ];

  // Get current active section font config
  const currentSectionConfig: FontSectionConfig =
    activeSection === 'all'
      ? {
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          fontFamily: config.fontFamily,
          customColor: config.customColor,
          useCustomColor: config.useCustomColor,
        }
      : config[activeSection] || {
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          fontFamily: config.fontFamily,
          customColor: config.customColor,
          useCustomColor: config.useCustomColor,
        };

  const updateCurrentConfig = (partial: Partial<FontSectionConfig>) => {
    if (activeSection === 'all') {
      const nextGlobal = {
        ...config,
        ...partial,
      };
      // Apply to all sub-sections as well
      const nextSection: FontSectionConfig = {
        fontSize: nextGlobal.fontSize,
        fontWeight: nextGlobal.fontWeight,
        fontFamily: nextGlobal.fontFamily,
        customColor: nextGlobal.customColor,
        useCustomColor: nextGlobal.useCustomColor,
      };
      onChange({
        ...nextGlobal,
        title: { ...(config.title || nextSection), ...partial },
        signal: { ...(config.signal || nextSection), ...partial },
        bus: { ...(config.bus || nextSection), ...partial },
        footer: { ...(config.footer || nextSection), ...partial },
      });
    } else {
      const updatedSection = {
        ...currentSectionConfig,
        ...partial,
      };
      onChange({
        ...config,
        [activeSection]: updatedSection,
      });
    }
  };

  const handleApplyToAll = () => {
    const cur = currentSectionConfig;
    onChange({
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('font_settings_title')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '支持针对标题、信号名称、总线数据及页脚分别配置独立字体'
                  : 'Customize separate fonts for Title, Signals, Bus Data, and Footer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'signal' as const, label: lang === 'zh' ? '信号与刻度' : 'Signals & Ticks' },
            { id: 'title' as const, label: lang === 'zh' ? '标题字体' : 'Head / Title' },
            { id: 'bus' as const, label: lang === 'zh' ? '总线数据' : 'Bus Data' },
            { id: 'footer' as const, label: lang === 'zh' ? '页脚说明' : 'Foot / Legend' },
            { id: 'all' as const, label: lang === 'zh' ? '全部统一' : 'All Sections' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[70vh] overflow-y-auto">
          {/* Live Preview Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'zh' ? '当前区域预览' : 'Preview'}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold">
                {activeSection.toUpperCase()}
              </span>
            </div>
            <div
              className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs"
              style={{
                fontFamily: currentSectionConfig.fontFamily,
                fontWeight: currentSectionConfig.fontWeight,
                fontSize: `${currentSectionConfig.fontSize}px`,
                color: currentSectionConfig.useCustomColor ? currentSectionConfig.customColor : undefined,
              }}
            >
              {activeSection === 'title' && <span>SPI Master Read Waveform (Head)</span>}
              {activeSection === 'signal' && <span>clk_core, rst_n, awaddr[31:0]</span>}
              {activeSection === 'bus' && <span>0x1FFF ... DATA_PACKET_0</span>}
              {activeSection === 'footer' && <span>Figure 1-2. Timing Window (Foot)</span>}
              {activeSection === 'all' && <span>clk_core = 0xAA (All Regions)</span>}
            </div>
          </div>

          {/* Font Size */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {t('font_size')}: <span className="font-mono text-blue-600 dark:text-blue-400">{currentSectionConfig.fontSize}px</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateCurrentConfig({ fontSize: Math.max(9, currentSectionConfig.fontSize - 1) })}
                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateCurrentConfig({ fontSize: Math.min(36, currentSectionConfig.fontSize + 1) })}
                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer"
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
            <span className="font-bold text-slate-700 dark:text-slate-200">
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
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {t('font_family')}
              </span>
              <span className="text-[11px] text-slate-400">
                {lang === 'zh' ? '包含等宽代码、现代无衬线、中文黑体与论文衬线' : 'Monospace, Sans, Chinese & Serif'}
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
              <span className="font-bold text-slate-700 dark:text-slate-200">
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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FONT_CONFIG)}
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
