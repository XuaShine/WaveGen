import React, { useState, useEffect, useRef } from 'react';
import {
  Waves,
  BookOpen,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  FolderOpen,
  Columns,
  Rows,
  Save,
  Undo2,
  Redo2,
  FilePlus,
  Pencil,
  Check,
  ShieldCheck,
  Languages,
  Palette,
  ZoomIn,
  ChevronDown,
} from 'lucide-react';
import { ViewLayout, WaveSkin } from '../types';
import { AVAILABLE_SKINS, getSkinInfo } from '../lib/skins';
import { useI18n } from '../lib/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

interface NavbarProps {
  themeMode: ThemeMode;
  effectiveDarkMode: boolean;
  onChangeThemeMode: (mode: ThemeMode) => void;
  layoutMode: ViewLayout;
  onToggleLayoutMode: () => void;
  onOpenTemplateLibrary: () => void;
  onOpenProjectModal: () => void;
  onOpenNewProject?: () => void;
  onOpenHelpModal: () => void;
  onOpenTextGuide?: () => void;
  onResetToDefault: () => void;
  skin?: WaveSkin;
  onSkinChange?: (skin: WaveSkin) => void;
  hscale?: number;
  onHscaleChange?: (hscale: number) => void;
  autoSaveStatus?: 'saved' | 'saving';
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  projectName?: string;
  onUpdateProjectName?: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  themeMode,
  effectiveDarkMode,
  onChangeThemeMode,
  layoutMode,
  onToggleLayoutMode,
  onOpenTemplateLibrary,
  onOpenProjectModal,
  onOpenNewProject,
  onOpenHelpModal,
  onOpenTextGuide,
  onResetToDefault,
  skin = 'default',
  onSkinChange,
  hscale = 1,
  onHscaleChange,
  autoSaveStatus = 'saved',
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  projectName = 'MyTimingDiagram',
  onUpdateProjectName,
}) => {
  const [showThemeDropdown, setShowThemeDropdown] = useState<boolean>(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [showSkinDropdown, setShowSkinDropdown] = useState<boolean>(false);
  const skinDropdownRef = useRef<HTMLDivElement>(null);

  // Inline project name editing state
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editingNameValue, setEditingNameValue] = useState<string>(projectName);
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);
  const { language, setLanguage, t } = useI18n();

  useEffect(() => {
    setEditingNameValue(projectName);
  }, [projectName]);

  const handleCommitProjectName = () => {
    setIsEditingName(false);
    const trimmed = editingNameValue.trim();
    if (trimmed && trimmed !== projectName && onUpdateProjectName) {
      onUpdateProjectName(trimmed);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 1800);
    } else {
      setEditingNameValue(projectName);
    }
  };

  const handleKeyDownName = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitProjectName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditingNameValue(projectName);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false);
      }
      if (skinDropdownRef.current && !skinDropdownRef.current.contains(e.target as Node)) {
        setShowSkinDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSkinInfo = getSkinInfo(skin);

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Brand, Logo & Editable Project Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs shrink-0">
          <Waves className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              WaveGen
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
              v1.0
            </span>
          </div>

          {/* Inline Project / File Renaming Component (User Request: 包括文件重命名等，打开失焦保存) */}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={handleCommitProjectName}
                  onKeyDown={handleKeyDownName}
                  autoFocus
                  placeholder="工程名称..."
                  className="px-2 py-0.5 text-xs font-semibold rounded-md border border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-36 sm:w-48 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleCommitProjectName}
                  className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 cursor-pointer"
                  title="确认重命名 (Enter / 失焦自动保存)"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-1.5 px-1.5 py-0.5 -ml-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-slate-600 dark:text-slate-300 min-w-0"
                title="点击重命名工程文件 (支持回车或失焦即存)"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px] sm:max-w-[220px]">
                  {projectName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">.wavedrom</span>
                <Pencil className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                {showSavedFeedback && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                    ✓ 已保存
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Undo / Redo Actions */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="撤销修改 (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="重做修改 (Ctrl+Y / Cmd+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Protocol Templates Library */}
        <button
          onClick={onOpenTemplateLibrary}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-2xs font-medium text-xs cursor-pointer"
          title="协议模板库与时序窗口（SPI/I2C/UART/AXI/建立保持窗口等）"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('template_library') || '模板库'}</span>
        </button>

        {/* Consolidated Project & Code Center Button */}
        <button
          onClick={onOpenProjectModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs font-medium text-xs cursor-pointer"
          title="工程管理：新建工程、打开/另存 .wavedrom、双向编辑、保存为预设模板、快照历史与重命名"
        >
          <Save className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{t('project_manage') || '工程管理'}</span>
        </button>

        {/* Live Auto-save Status Indicator (User Request: 失焦保存开启改成自动保存就行了) */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 select-none bg-emerald-50/60 dark:bg-emerald-950/40 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80"
          title="实时自动保存：任何输入修改或失焦时自动落盘存储"
        >
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              autoSaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
            }`}
          />
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{autoSaveStatus === 'saving' ? (language === 'zh' ? '保存中...' : 'Saving...') : (language === 'zh' ? '自动保存' : 'Auto Saved')}</span>
        </div>

        {/* Waveform Skin Selector */}
        {onSkinChange && (
          <div className="relative" ref={skinDropdownRef}>
            <button
              type="button"
              onClick={() => setShowSkinDropdown(!showSkinDropdown)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
              title={language === 'zh' ? '波形视觉皮肤风格' : 'Waveform visual skin'}
            >
              <Palette className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" style={{ backgroundColor: currentSkinInfo.bgColor }} />
              <span className="hidden xl:inline">
                {language === 'zh' ? currentSkinInfo.name : currentSkinInfo.enName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSkinDropdown && (
              <div className="absolute right-0 mt-1.5 w-60 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1">
                  {language === 'zh' ? '选择波形皮肤风格' : 'Waveform Skins'}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5 px-1">
                  {AVAILABLE_SKINS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSkinChange(s.id);
                        setShowSkinDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
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
                        <span className="truncate">{language === 'zh' ? s.name : s.enName}</span>
                      </div>
                      {skin === s.id && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canvas Horizontal Zoom (Hscale) */}
        {onHscaleChange && (
          <div
            className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs shadow-2xs"
            title={language === 'zh' ? '画板每拍宽度缩放 (hscale: 1x, 2x, 3x...)' : 'Canvas horizontal scale per cycle (hscale)'}
          >
            <span className="px-1 text-[11px] font-bold text-slate-400 hidden xl:inline">
              {language === 'zh' ? '缩放' : 'Scale'}
            </span>
            <button
              type="button"
              onClick={() => onHscaleChange(Math.max(1, hscale - 1))}
              disabled={hscale <= 1}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 cursor-pointer font-bold"
              title="缩小每拍宽度"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onHscaleChange(hscale >= 4 ? 1 : hscale + 1)}
              className="px-1.5 font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              title="点击在 1x, 2x, 3x, 4x 间轮换"
            >
              {hscale}x
            </button>
            <button
              type="button"
              onClick={() => onHscaleChange(Math.min(6, hscale + 1))}
              disabled={hscale >= 6}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-25 cursor-pointer font-bold"
              title="放大每拍宽度"
            >
              +
            </button>
          </div>
        )}

        {/* Layout Mode Toggle (Split Screen vs Stacked) */}
        <button
          onClick={onToggleLayoutMode}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            layoutMode === 'split'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
          title={layoutMode === 'split' ? (language === 'zh' ? '切换为上下堆叠视图' : 'Switch to Stacked View') : (language === 'zh' ? '切换为左右分屏视图' : 'Switch to Split View')}
        >
          {layoutMode === 'split' ? <Columns className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {layoutMode === 'split' ? (t('split_view') || '左右分屏') : (t('stacked_view') || '上下堆叠')}
          </span>
        </button>

        {/* Unified Help & Guide */}
        <button
          onClick={onOpenHelpModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
          title="WaveGen 使用指南与语法符号速查"
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>{t('user_guide') || '使用指南'}</span>
        </button>

        {/* Reset */}
        <button
          onClick={onResetToDefault}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
          title={language === 'zh' ? '重置波形 (清空并加载基础模板)' : 'Reset diagram to default'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Bilingual Language Switcher (Segmented Control: 清楚直观，彻底消除歧义) */}
        <div className="flex items-center rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
              language === 'zh'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="切换为简体中文"
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Switch to English"
          >
            EN
          </button>
        </div>

        {/* Theme Mode Selector */}
        <div className="relative" ref={themeDropdownRef}>
          <button
            type="button"
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium"
            title={`${language === 'zh' ? '主题模式: ' : 'Theme: '}${
              themeMode === 'system' ? t('theme_system') : themeMode === 'dark' ? t('theme_dark') : t('theme_light')
            }`}
          >
            {themeMode === 'system' ? (
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
            ) : effectiveDarkMode ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="hidden lg:inline">
              {themeMode === 'system' ? t('theme_system') : themeMode === 'dark' ? t('theme_dark') : t('theme_light')}
            </span>
          </button>

          {/* Theme Dropdown Menu */}
          {showThemeDropdown && (
            <div className="absolute right-0 mt-1.5 w-32 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChangeThemeMode('light');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                  themeMode === 'light'
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('theme_light')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeThemeMode('dark');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                  themeMode === 'dark'
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('theme_dark')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeThemeMode('system');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                  themeMode === 'system'
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('theme_system')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
