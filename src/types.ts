export type WaveSymbol =
  | '0' // Low
  | '1' // High
  | '2' // Bus style 2 (salmon)
  | '3' // Bus style 3 (cyan)
  | '4' // Bus style 4 (purple)
  | '5' // Bus style 5 (green)
  | '6' // Bus style 6 (yellow)
  | '7' // Bus style 7 (blue)
  | '8' // Bus style 8
  | '9' // Bus style 9
  | '=' // Bus standard
  | 'x' // Undefined / Don't care
  | 'z' // High-Z / Tri-state
  | 'p' // Pos clock with arrow
  | 'P' // Pos clock without arrow
  | 'n' // Neg clock with arrow
  | 'N' // Neg clock without arrow
  | 'u' // Up transition
  | 'd' // Down transition
  | 'h' // High pulse
  | 'H' // High pulse
  | 'l' // Low pulse
  | 'L' // Low pulse
  | '.' // Continue / hold previous
  | '|'; // Gap / time break

export type SignalCategory =
  | 'clock'
  | 'reset'
  | 'control'
  | 'address'
  | 'status'
  | 'bus'
  | 'other'
  | (string & {});

export interface CategoryMeta {
  id: string;
  name: string;
  label?: string; // alias for name
  enName?: string;
  icon: string;
  badgeClass: string;
  badgeCls?: string; // alias for badgeClass
  dotColor?: string;
  description?: string;
  isCustom?: boolean;
}

export const SIGNAL_CATEGORIES: CategoryMeta[] = [
  {
    id: 'clock',
    name: '时钟',
    label: '时钟',
    enName: 'Clock',
    icon: '',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    badgeCls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    dotColor: '#3b82f6',
    description: '时钟基准 (ACLK, HCLK, PCLK, CLK)',
  },
  {
    id: 'reset',
    name: '复位',
    label: '复位',
    enName: 'Reset',
    icon: '',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    badgeCls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    dotColor: '#f43f5e',
    description: '复位信号 (ARESETn, HRESETn, PRESETn, RST)',
  },
  {
    id: 'control',
    name: '控制',
    label: '控制',
    enName: 'Control',
    icon: '',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    badgeCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    dotColor: '#10b981',
    description: '握手与使能 (AWVALID, WREADY, TVALID, PENABLE)',
  },
  {
    id: 'address',
    name: '地址',
    label: '地址',
    enName: 'Address',
    icon: '',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    badgeCls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    dotColor: '#6366f1',
    description: '地址与命令 (AWADDR, ARADDR, HADDR, PADDR)',
  },
  {
    id: 'bus',
    name: '数据',
    label: '数据',
    enName: 'Data',
    icon: '',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-300 dark:border-violet-800',
    badgeCls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-300 dark:border-violet-800',
    dotColor: '#8b5cf6',
    description: '数据载荷 (WDATA, RDATA, TDATA, HWDATA, PWDATA)',
  },
  {
    id: 'status',
    name: '状态',
    label: '状态',
    enName: 'Status',
    icon: '',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    dotColor: '#f59e0b',
    description: '响应与状态 (BRESP, RRESP, PSLVERR, WLAST, TLAST)',
  },
  {
    id: 'other',
    name: '其它',
    label: '其它',
    enName: 'Other',
    icon: '',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    badgeCls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    dotColor: '#64748b',
    description: '通用用户信号与辅助引脚',
  },
];

export const SIGNAL_CATEGORIES_MAP: Record<string, CategoryMeta> = SIGNAL_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat;
  return acc;
}, {} as Record<string, CategoryMeta>);

export function getCategoryMeta(id?: string, customCategories: CategoryMeta[] = []): CategoryMeta {
  if (!id) return SIGNAL_CATEGORIES[SIGNAL_CATEGORIES.length - 1];
  const custom = customCategories.find((c) => c.id === id);
  if (custom) return custom;
  const found = SIGNAL_CATEGORIES.find((c) => c.id === id);
  return (
    found || {
      id,
      name: id,
      label: id,
      icon: '🏷️',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      badgeCls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      dotColor: '#64748b',
    }
  );
}

export function inferSignalCategory(signal: { name?: string; wave?: string; category?: SignalCategory }): SignalCategory {
  if (signal.category) return signal.category;
  const rawName = (signal.name || '').trim().toLowerCase();
  const wave = (signal.wave || '').trim();

  // Strip common bus/channel/master/slave prefixes (e.g. m_axi_, s_axi_, axi4_, ahb_, apb_, axis_, dut_)
  const name = rawName.replace(/^(m_|s_|io_|u_|core_|dut_)?(axi\d*|axis|ahb|apb|amba|chi)?_?/i, '');

  // 1. Clock inference (AMBA ACLK, HCLK, PCLK, or standard clock waveforms)
  if (
    /^(aclk|hclk|pclk|mclk|sclk|bclk|fclk|clk|clock)/i.test(name) ||
    /^(aclk|hclk|pclk|mclk|sclk|bclk|fclk|clk|clock)/i.test(rawName) ||
    /_(clk|aclk|hclk|pclk)$/i.test(rawName) ||
    /^[pPnN]/.test(wave)
  ) {
    return 'clock';
  }

  // 2. Reset inference (AMBA ARESETn, HRESETn, PRESETn, RST_N)
  if (
    /^(aresetn|hresetn|presetn|rst_n|rst_b|resetn|rst|reset|clr|por)/i.test(name) ||
    /^(aresetn|hresetn|presetn|rst_n|rst_b|resetn|rst|reset|clr|por)/i.test(rawName) ||
    /_(rst|rst_n|aresetn|hresetn|presetn|resetn)$/i.test(rawName)
  ) {
    return 'reset';
  }

  // 3. AMBA Handshake & Control Signals (VALID / READY, ENABLE, TRANS, STRB, SEL, WAKEUP, LOCK)
  // AXI5/4/3: AWVALID, AWREADY, WVALID, WREADY, BVALID, BREADY, ARVALID, ARREADY, RVALID, RREADY, AWWAKEUP, ARWAKEUP
  // AXI-Stream: TVALID, TREADY, TWAKEUP
  // ACE: ACVALID, ACREADY, CRVALID, CRREADY, CDVALID, CDREADY, RACK, WACK
  // AHB5/Lite: HREADY, HREADYOUT, HSEL, HTRANS, HWRITE, HMASTLOCK, HEXCL, HNONSEC
  // APB5/4/3: PSEL, PENABLE, PREADY, PWRITE, PWAKEUP
  // CHI: FLITV, LCRDV, FLITPEND
  if (
    /^(awvalid|awready|wvalid|wready|bvalid|bready|arvalid|arready|rvalid|rready|tvalid|tready)/i.test(name) ||
    /^(acvalid|acready|crvalid|crready|cdvalid|cdready|rack|wack|flitv|lcrdv|flitpend)/i.test(name) ||
    /^(pready|penable|psel|pwrite|pwakeup|hready|hreadyout|hsel|htrans|hwrite|hmastlock|hexcl|hnonsec)/i.test(name) ||
    /^(valid|ready|enable|req|ack|sel|cs|we|wr|rd|start|done|vld|rdy|irq|intr)/i.test(name) ||
    /_(valid|ready|vld|rdy|en|enable|req|ack|sel|cs|we|wr|rd)$/i.test(rawName)
  ) {
    return 'control';
  }

  // 4. AMBA Address & Transfer Properties
  // AXI: AWADDR, ARADDR, AWLEN, AWSIZE, AWBURST, AWLOCK, AWCACHE, AWPROT, AWQOS, AWREGION, AWUSER, ARLEN, ARSIZE, ARBURST, ARLOCK, ARCACHE, ARPROT, ARQOS, ARREGION, ARUSER, AWID, ARID
  // ACE: ACADDR, ACSNOOP, ACPROT
  // AHB: HADDR, HSIZE, HBURST, HPROT, HAUSER, HMASTER
  // APB: PADDR, PPROT, PAUSER
  if (
    /^(awaddr|araddr|haddr|paddr|acaddr|addr|address)/i.test(name) ||
    /^(awlen|awsize|awburst|awlock|awcache|awprot|awqos|awregion|awuser|awid)/i.test(name) ||
    /^(arlen|arsize|arburst|arlock|arcache|arprot|arqos|arregion|aruser|arid)/i.test(name) ||
    /^(acsnoop|acprot|hsize|hburst|hprot|hauser|hmaster|pprot|pauser)/i.test(name) ||
    /_(addr|awaddr|araddr)$/i.test(rawName)
  ) {
    return 'address';
  }

  // 5. AMBA Response & Packet Boundary / Status
  // AXI: BRESP, RRESP, WLAST, RLAST, BID, RID, BUSER
  // AXI-Stream: TLAST, TID, TDEST, TUSER
  // ACE: CRRESP, CDLAST
  // AHB: HRESP, HEXOKAY
  // APB: PSLVERR, PRUSER, PBUSER
  if (
    /^(bresp|rresp|crresp|hresp|hexokay|pslverr|wlast|rlast|tlast|cdlast)/i.test(name) ||
    /^(bid|rid|buser|tid|tdest|tuser|pruser|pbuser)/i.test(name) ||
    /^(err|error|stat|status|flag|busy|wait|full|empty|alarm)/i.test(name) ||
    /_(last|resp|err|error)$/i.test(rawName)
  ) {
    return 'status';
  }

  // 6. AMBA Data & Bus Signals
  // AXI: WDATA, RDATA, WSTRB, WUSER, RUSER
  // AXI-Stream: TDATA, TKEEP, TSTRB
  // AHB: HWDATA, HRDATA, HWSTRB
  // APB: PWDATA, PRDATA, PSTRB
  // CHI: TXDAT, RXDAT, TXREQ, RXRSP
  if (
    /^(wdata|rdata|hwdata|hrdata|pwdata|prdata|tdata|tkeep|tstrb|wstrb|pstrb|hwstrb)/i.test(name) ||
    /^(data|din|dout|tx|rx|payload|bus|dq|txdat|rxdat)/i.test(name) ||
    /_(data|wdata|rdata|tdata|wstrb|tkeep)$/i.test(rawName) ||
    /\[\d+:\d+\]/.test(rawName) ||
    wave.includes('=') ||
    /[2-9]/.test(wave)
  ) {
    return 'bus';
  }

  return 'other';
}

export interface SignalItem {
  id: string;
  name: string;
  wave: string; // e.g. "p....." or "0.1.x.=.0"
  data?: string[]; // strings for bus values
  period?: number; // clock/signal period multiplier
  phase?: number; // phase offset in cycles
  node?: string; // node markers like "..a..b.."
  category?: SignalCategory; // explicit or auto-categorized signal category
  group?: string; // Signal Group name (WaveDrom renders with left bracket enclosing group signals)
  isSpacer?: boolean; // {} in wavejson
}

export type CellDensity = 'standard' | 'compact' | 'mini';

export interface EdgeAnnotation {
  id: string;
  source: string; // node name or coordinate, e.g. "a"
  target: string; // node name or coordinate, e.g. "b"
  arrow: '->' | '~>' | '<->' | '-~>' | '<~>' | '-|' | '|->' | '<->';
  label?: string; // e.g. "t_setup", "Tprop"
  style?: string; // optional styling
}

export interface HeadFootConfig {
  text?: string;
  tick?: number | string | (number | string)[]; // starting tick number, e.g. 0, or with step "0 0.25", or custom labels
  every?: number; // tick frequency
  tock?: number | string | (number | string)[];
  step?: number | string; // user-configured step value for UI state
  unit?: string; // e.g. "ns", "ps", "us", "T"
}

export type WaveSkin =
  | 'default'
  | 'dark'
  | 'blueprint'
  | 'matrix'
  | 'cyberpunk'
  | 'paper'
  | 'lowkey'
  | 'narrow'
  | 'narrower';

export type WaveformFontFamily =
  | 'monospace'
  | 'jetbrains-mono'
  | 'fira-code'
  | 'consolas'
  | 'source-code-pro'
  | 'courier'
  | 'sans-serif'
  | 'inter'
  | 'roboto'
  | 'segoe-ui'
  | 'arial'
  | 'chinese-sans'
  | 'serif'
  | 'times'
  | 'georgia'
  | 'system-ui'
  | string;

export interface FontSectionConfig {
  fontSize: number;
  fontWeight: '400' | '500' | '700' | '900';
  fontFamily: WaveformFontFamily;
  customColor: string;
  useCustomColor: boolean;
}

export interface WaveformFontConfig {
  fontSize: number;
  fontWeight: '400' | '500' | '700' | '900';
  fontFamily: WaveformFontFamily;
  customColor: string;
  useCustomColor: boolean;

  // Separate typography configs for distinct diagram regions
  title?: FontSectionConfig;
  signal?: FontSectionConfig;
  bus?: FontSectionConfig;
  footer?: FontSectionConfig;
}

export const DEFAULT_FONT_CONFIG: WaveformFontConfig = {
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'monospace',
  customColor: '#0f172a',
  useCustomColor: false,
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
    customColor: '#0f172a',
    useCustomColor: false,
  },
  signal: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
    customColor: '#0f172a',
    useCustomColor: false,
  },
  bus: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
    customColor: '#0f172a',
    useCustomColor: false,
  },
  footer: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'monospace',
    customColor: '#0f172a',
    useCustomColor: false,
  },
};

export interface DiagramConfig {
  hscale: number;
  skin: WaveSkin;
  font?: WaveformFontConfig;
  fontConfig?: WaveformFontConfig;
}

export type WaveHeadFoot = HeadFootConfig;
export type WaveConfig = DiagramConfig;

export type EditorTool = 'select' | '0' | '1' | '.' | 'p' | '=' | 'x' | 'z' | 'node';
export type ViewLayout = 'split' | 'stacked';

export interface WaveJson {
  signal: Array<
    | {
        name?: string;
        wave?: string;
        data?: string[] | string;
        period?: number;
        phase?: number;
        node?: string;
      }
    | Record<string, never> // spacer
    | Array<unknown> // group
  >;
  edge?: string[];
  head?: HeadFootConfig;
  foot?: HeadFootConfig;
  config?: DiagramConfig;
}

export type WaveDromObject = WaveJson;

export interface ProtocolTemplate {
  id: string;
  name: string;
  category: 'Basic' | 'Bus' | 'Serial' | 'Memory' | 'Clock' | 'Control' | 'Timing' | 'Custom';
  description: string;
  totalCycles: number;
  signals: SignalItem[];
  edges?: EdgeAnnotation[];
  head?: HeadFootConfig;
  foot?: HeadFootConfig;
  config?: DiagramConfig;
}
