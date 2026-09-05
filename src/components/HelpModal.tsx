import React from 'react';
import { X, BookOpen, MousePointer, Cpu, ArrowRight } from 'lucide-react';
import { WAVE_SYMBOLS } from '../data/symbols';
import { useI18n } from '../lib/i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useI18n();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {lang === 'zh' ? 'WaveDrom 符号手册与操作指南' : 'WaveDrom Symbol Cheatsheet & Guide'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {lang === 'zh'
                  ? '深入掌握波形字符含义与高效可视化交互技巧'
                  : 'Master waveform characters and productivity tricks'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Quick Tips Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-300">
                <MousePointer className="w-4 h-4 text-blue-600" />
                <span>{lang === 'zh' ? '快速单击编辑' : 'Click to Cycle'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '在每个信号行的时间方块上直接点击，可在 0、1、时钟、总线、X、Z 之间循环切换。右键或按住 Shift 点击可唤出全部符号菜单。'
                  : 'Click on timing cells to cycle levels (0, 1, clock, bus, X, Z). Right-click to open full symbol menu.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-violet-900 dark:text-violet-300">
                <Cpu className="w-4 h-4 text-violet-600" />
                <span>{lang === 'zh' ? '总线数据映射' : 'Bus Data Mapping'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '遇到总线符号（`=` 或彩色 `2..9`）时，点击信号右上角“总线数据”按钮，填写的文本（如 0x8000、DATA）将依次自动显示在各个总线块内。'
                  : 'For bus segments (`=` or color `2..9`), click the "Bus Data" button to enter labels displayed inside bus sections.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-purple-900 dark:text-purple-300">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span>{lang === 'zh' ? '节点与箭头连线' : 'Nodes & Arrows'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '在周期单元格中赋予字母（如 a, b），随后在下方“时序箭头”面板中配置 a~>b 即可一键生成建立/保持时间箭头。'
                  : 'Tag cycles with node letters (e.g. a, b), then configure rules like a~>b to generate timing arrows.'}
              </p>
            </div>
          </div>

          {/* Symbols Table */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === 'zh' ? 'WaveDrom 基础字符一览表' : 'WaveDrom Symbols Reference'}
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2 px-3 w-16 text-center">{lang === 'zh' ? '符号' : 'Symbol'}</th>
                    <th className="py-2 px-3 w-32">{lang === 'zh' ? '名称' : 'Name'}</th>
                    <th className="py-2 px-3">{lang === 'zh' ? '功能与渲染效果描述' : 'Description'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {WAVE_SYMBOLS.map((item) => (
                    <tr key={item.symbol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${item.badgeBg}`}>
                          {item.symbol}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {lang === 'zh' ? (item.nameZh || item.name) : item.name}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {lang === 'zh' ? (item.descZh || item.desc) : item.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-xs cursor-pointer"
          >
            {lang === 'zh' ? '我知道了' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
