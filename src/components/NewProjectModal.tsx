import React, { useState } from 'react';
import {
  X,
  FilePlus,
  Sparkles,
  Layers,
  Cpu,
  Radio,
  Check,
  Zap,
  Bookmark,
} from 'lucide-react';
import { SignalItem, EdgeAnnotation, HeadFootConfig, DiagramConfig, ProtocolTemplate } from '../types';
import { useI18n } from '../lib/i18n';

export interface NewProjectTemplate {
  id: string;
  name: string;
  enName?: string;
  description: string;
  enDescription?: string;
  icon: React.ReactNode;
  category: string;
  enCategory?: string;
  totalCycles: number;
  signals: SignalItem[];
  edges?: EdgeAnnotation[];
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (
    projectName: string,
    templateData: {
      signals: SignalItem[];
      edges: EdgeAnnotation[];
      head: HeadFootConfig;
      foot: HeadFootConfig;
      config: DiagramConfig;
      totalCycles: number;
    },
    templateId?: string
  ) => void;
  currentDesign: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  };
}

const TEMPLATES: NewProjectTemplate[] = [
  {
    id: 'blank',
    name: '空白波形画布',
    enName: 'Blank Canvas',
    description: '标准基础工程，包含 1 路主时钟与 1 路数据信号，自由从零设计',
    enDescription: 'Basic project with 1 master clock and 1 data signal for custom design',
    icon: <FilePlus className="w-4 h-4 text-blue-500" />,
    category: '基础',
    enCategory: 'Basic',
    totalCycles: 12,
    signals: [
      {
        id: 'sig_clk_base',
        name: 'clk',
        wave: 'p...........',
        category: 'clock',
        period: 1,
        phase: 0,
        data: [],
      },
      {
        id: 'sig_data_base',
        name: 'data_in',
        wave: '01.x=.01.zz.',
        category: 'bus',
        period: 1,
        phase: 0,
        data: ['IDLE', 'VALID'],
      },
    ],
  },
  {
    id: 'sync_bus',
    name: '经典同步总线时序',
    enName: 'Synchronous Bus',
    description: '包含 CLK、复位 RST_N、请求 REQ、响应 ACK 与 32位数据总线',
    enDescription: 'Includes CLK, RST_N, REQ, ACK handshake and 32-bit data bus',
    icon: <Layers className="w-4 h-4 text-indigo-500" />,
    category: '总线协议',
    enCategory: 'Bus Protocol',
    totalCycles: 16,
    signals: [
      {
        id: 'sig_clk',
        name: 'sys_clk',
        wave: 'p...............',
        category: 'clock',
        period: 1,
        phase: 0,
      },
      {
        id: 'sig_rst',
        name: 'rst_n',
        wave: '0.1.............',
        category: 'reset',
        period: 1,
        phase: 0,
      },
      {
        id: 'sig_req',
        name: 'bus_req',
        wave: '0...1...0.......',
        category: 'control',
        period: 1,
        phase: 0,
      },
      {
        id: 'sig_ack',
        name: 'bus_ack',
        wave: '0.....1.0.......',
        category: 'status',
        period: 1,
        phase: 0,
      },
      {
        id: 'sig_addr',
        name: 'addr[15:0]',
        wave: 'x...=...x.......',
        category: 'bus',
        data: ['0x8000'],
      },
      {
        id: 'sig_data',
        name: 'data[31:0]',
        wave: 'z.....=...z.....',
        category: 'bus',
        data: ['0xDEADBEEF'],
      },
    ],
  },
  {
    id: 'spi',
    name: 'SPI 串行外设接口',
    enName: 'SPI Serial Protocol',
    description: '标准 SPI 传输：SCLK、片选 CS_N、主机输出 MOSI 与输入 MISO',
    enDescription: 'Standard SPI transfer with SCLK, CS_N, MOSI and MISO lines',
    icon: <Cpu className="w-4 h-4 text-emerald-500" />,
    category: '串行通信',
    enCategory: 'Serial Protocol',
    totalCycles: 16,
    signals: [
      {
        id: 'spi_cs',
        name: 'SPI_CS_N',
        wave: '10............1.',
        category: 'control',
      },
      {
        id: 'spi_sclk',
        name: 'SPI_SCLK',
        wave: '0.p.p.p.p.p.p.0.',
        category: 'clock',
      },
      {
        id: 'spi_mosi',
        name: 'SPI_MOSI',
        wave: 'x.1.0.1.1.0.1.x.',
        category: 'bus',
      },
      {
        id: 'spi_miso',
        name: 'SPI_MISO',
        wave: 'z...1.0.1.0.0.z.',
        category: 'bus',
      },
    ],
  },
  {
    id: 'i2c',
    name: 'I2C 双线制读写时序',
    enName: 'I2C Bus Protocol',
    description: '包含开漏时钟 SCL、双向数据 SDA 与 START / ACK / STOP 条件',
    enDescription: 'Open-drain SCL and bidirectional SDA with START, ACK and STOP conditions',
    icon: <Radio className="w-4 h-4 text-amber-500" />,
    category: '串行通信',
    enCategory: 'Serial Protocol',
    totalCycles: 16,
    signals: [
      {
        id: 'i2c_scl',
        name: 'I2C_SCL',
        wave: '1.0.1.0.1.0.1.0.1.0.1',
        category: 'clock',
      },
      {
        id: 'i2c_sda',
        name: 'I2C_SDA',
        wave: '10...1...0...10.1...1',
        category: 'bus',
      },
    ],
  },
  {
    id: 'axi_stream',
    name: 'AXI4-Stream 握手协议',
    enName: 'AXI4-Stream Handshake',
    description: '包含 ACLK、ARESETn、TVALID、TREADY、TDATA 与 TLAST 握手',
    enDescription: 'Full ACLK, ARESETn, TVALID, TREADY, TDATA payload and TLAST packet',
    icon: <Zap className="w-4 h-4 text-purple-500" />,
    category: '总线协议',
    enCategory: 'Bus Protocol',
    totalCycles: 16,
    signals: [
      {
        id: 'axi_clk',
        name: 'ACLK',
        wave: 'p...............',
        category: 'clock',
      },
      {
        id: 'axi_rst',
        name: 'ARESETn',
        wave: '0.1.............',
        category: 'reset',
      },
      {
        id: 'axi_valid',
        name: 'TVALID',
        wave: '0...1...0.1...0.',
        category: 'control',
      },
      {
        id: 'axi_ready',
        name: 'TREADY',
        wave: '0.....1...0.1.0.',
        category: 'status',
      },
      {
        id: 'axi_data',
        name: 'TDATA[31:0]',
        wave: 'x...=...x.=.=.x.',
        category: 'bus',
        data: ['DATA_0', 'DATA_1', 'DATA_LAST'],
      },
      {
        id: 'axi_last',
        name: 'TLAST',
        wave: '0...........1.0.',
        category: 'control',
      },
    ],
  },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  currentDesign,
}) => {
  const { lang } = useI18n();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [projectNameInput, setProjectNameInput] = useState<string>('');
  const [autoSnapshotCurrent, setAutoSnapshotCurrent] = useState<boolean>(true);

  // Load custom templates from localStorage
  const [customTemplates, setCustomTemplates] = useState<ProtocolTemplate[]>(() => {
    try {
      const raw = localStorage.getItem('wavedrom_custom_templates_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  // Re-read custom templates whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('wavedrom_custom_templates_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCustomTemplates(parsed);
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [isOpen]);

  // Generate a friendly default name when opened
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      setProjectNameInput(`Timing_Project_${timeStr}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const finalName = projectNameInput.trim() || 'Untitled_Project';

    if (selectedTemplateId === 'clone_current') {
      // Clone current project with new name
      onCreateProject(finalName, {
        signals: JSON.parse(JSON.stringify(currentDesign.signals)),
        edges: JSON.parse(JSON.stringify(currentDesign.edges)),
        head: JSON.parse(JSON.stringify(currentDesign.head)),
        foot: JSON.parse(JSON.stringify(currentDesign.foot)),
        config: JSON.parse(JSON.stringify(currentDesign.config)),
        totalCycles: currentDesign.totalCycles,
      });
      onClose();
      return;
    }

    // Check if custom template was selected
    const customTpl = customTemplates.find((c) => c.id === selectedTemplateId);
    if (customTpl) {
      onCreateProject(
        finalName,
        {
          signals: JSON.parse(JSON.stringify(customTpl.signals)),
          edges: JSON.parse(JSON.stringify(customTpl.edges || [])),
          head: JSON.parse(JSON.stringify(customTpl.head || { tick: 0 })),
          foot: JSON.parse(JSON.stringify(customTpl.foot || { tock: false })),
          config: JSON.parse(JSON.stringify(customTpl.config || { hscale: 1, skin: 'default' })),
          totalCycles: customTpl.totalCycles || 16,
        },
        customTpl.id
      );
      onClose();
      return;
    }

    const tpl = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
    onCreateProject(
      finalName,
      {
        signals: JSON.parse(JSON.stringify(tpl.signals)),
        edges: JSON.parse(JSON.stringify(tpl.edges || [])),
        head: { tick: 0 },
        foot: { tock: false },
        config: { hscale: 1, skin: 'default' },
        totalCycles: tpl.totalCycles,
      },
      tpl.id
    );
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {lang === 'zh' ? '新建时序工程' : 'New Timing Project'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '配置工程名称并选择开箱即用的工业级协议骨架'
                  : 'Configure project name and pick an industrial protocol template'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          {/* Project Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {lang === 'zh' ? '工程名称 (Project / File Name)' : 'Project Name'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder={lang === 'zh' ? '输入工程名称...' : 'Enter project name...'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">
                .wavedrom
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'zh'
                ? '支持中文与英文字符，系统将在失焦或窗口切换时自动即时持久化到浏览器存储'
                : 'Supports alphanumeric characters. Changes are automatically saved.'}
            </p>
          </div>

          {/* Template Selection Grid */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{lang === 'zh' ? '选择初始时序模板' : 'Select Initial Template'}</span>
              <span className="text-[11px] font-normal text-slate-400">
                {lang === 'zh' ? '可自由增删修改信号' : 'Signals can be freely edited later'}
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Clone Current Project Option */}
              <button
                type="button"
                onClick={() => setSelectedTemplateId('clone_current')}
                className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  selectedTemplateId === 'clone_current'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '克隆当前工程副本' : 'Clone Current Project'}
                    </span>
                    {selectedTemplateId === 'clone_current' && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {lang === 'zh'
                      ? '复制当前工程的所有信号、周期与标尺，另存为新工程独立编辑'
                      : 'Duplicate all signals, cycles, and markers to edit independently'}
                  </p>
                </div>
              </button>

              {/* Custom Saved Preset Templates */}
              {customTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-500/30'
                        : 'border-purple-200/80 dark:border-purple-900/50 bg-white dark:bg-slate-800/50 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 shrink-0">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <span>{tpl.name}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1 py-0.2 rounded font-medium">
                            {lang === 'zh' ? '我的预设' : 'Custom'}
                          </span>
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {tpl.description || (lang === 'zh' ? `${tpl.signals.length} 条信号 · ${tpl.totalCycles} 拍周期` : `${tpl.signals.length} signals · ${tpl.totalCycles} cycles`)}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Standard Templates */}
              {TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                      {tpl.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {lang === 'en' && tpl.enName ? tpl.enName : tpl.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {lang === 'en' && tpl.enDescription ? tpl.enDescription : tpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto Snapshot Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              id="autoSnapshotCheck"
              checked={autoSnapshotCurrent}
              onChange={(e) => setAutoSnapshotCurrent(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="autoSnapshotCheck" className="cursor-pointer select-none">
              {lang === 'zh'
                ? '自动将当前工作区内容存档至工程快照历史（确保历史进度绝不丢失）'
                : 'Automatically archive current workspace into snapshot history to prevent data loss'}
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '立即创建新工程' : 'Create Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
