import * as defaultSkinModule from 'wavedrom/skins/default.js';
import * as darkSkinModule from 'wavedrom/skins/dark.js';
import * as lowkeySkinModule from 'wavedrom/skins/lowkey.js';
import * as narrowSkinModule from 'wavedrom/skins/narrow.js';
import * as narrowerSkinModule from 'wavedrom/skins/narrower.js';
import { WaveSkin } from '../types';

export interface SkinInfo {
  id: WaveSkin;
  name: string;
  enName: string;
  category: 'light' | 'dark' | 'compact';
  bgColor: string; // Hex color for canvas background & PNG export
  viewportBgClass: string; // Tailwind class for canvas viewport
  textColor: string;
  accentColor: string;
  desc: string;
  enDesc?: string;
  tag?: string;
  enTag?: string;
}

// Base wavedrom skin extraction helper
// WaveDrom skins in npm/Vite ESM interop may be wrapped in { default: [...] } or { dark: [...] }
// This helper guarantees returning a clean ONML SVG array: ['svg', { ... }, ...]
function extractSkinArray(mod: unknown, key: string): unknown[] {
  if (Array.isArray(mod)) return mod;
  const obj = mod as Record<string, unknown> | null | undefined;
  if (!obj) return [];
  if (Array.isArray(obj[key])) return obj[key] as unknown[];
  if (Array.isArray(obj.default)) return obj.default as unknown[];
  const defObj = obj.default as Record<string, unknown> | null | undefined;
  if (defObj && typeof defObj === 'object') {
    if (Array.isArray(defObj[key])) return defObj[key] as unknown[];
    if (Array.isArray(defObj.default)) return defObj.default as unknown[];
  }
  // Deep search for any property holding the ONML SVG root array
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    if (Array.isArray(val) && val[0] === 'svg') return val;
    if (val && typeof val === 'object') {
      const subObj = val as Record<string, unknown>;
      for (const subK of Object.keys(subObj)) {
        if (Array.isArray(subObj[subK]) && subObj[subK][0] === 'svg') {
          return subObj[subK] as unknown[];
        }
      }
    }
  }
  return [];
}

const rawDefault = extractSkinArray(defaultSkinModule, 'default');
const rawDark = extractSkinArray(darkSkinModule, 'dark');
const rawLowkey = extractSkinArray(lowkeySkinModule, 'lowkey');
const rawNarrow = extractSkinArray(narrowSkinModule, 'narrow');
const rawNarrower = extractSkinArray(narrowerSkinModule, 'narrower');

function cloneSkin<T>(skin: T): T {
  return JSON.parse(JSON.stringify(skin));
}

/**
 * Builds custom electronic blueprint skin from dark skin.
 * Crisp cyan/electric blue lines on engineering deep navy background.
 */
/**
 * Enhances dark skin for superior readability:
 * - High-contrast luminous cyan signal names (.info)
 * - Clear slate-200 tick numbers (.muted)
 * - Pure white title/notes text (fixing black text on dark background)
 * - Modern high-contrast dark bus fills (.s8..s15)
 */
function enhanceDarkSkin(): unknown[] {
  try {
    const base = rawDark.length > 0 ? rawDark : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css += `
        text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace, sans-serif !important; }
        .info { fill: #38bdf8 !important; font-weight: 700 !important; }
        .muted, .muted text, text.muted { fill: #cbd5e1 !important; font-weight: 500 !important; }
        text[fill="#000"], text[fill="black"] { fill: #f8fafc !important; font-weight: 700 !important; }
        /* High-contrast node tags and edge labels: remove white background box */
        g[id^="wavearcs"] rect, rect[style*="fill:#FFF"], rect[style*="fill:#fff"], rect[style*="fill:white"] {
          fill: #1e293b !important;
          stroke: #475569 !important;
          stroke-width: 0.8px !important;
          rx: 3px !important;
          ry: 3px !important;
        }
        g[id^="wavearcs"] text {
          fill: #38bdf8 !important;
          font-weight: 700 !important;
        }
        g[id^="wavearcs"] path {
          stroke: #38bdf8 !important;
        }
        marker#arrowhead path {
          fill: #38bdf8 !important;
          stroke: #38bdf8 !important;
        }
        .s8 { fill: #1e293b !important; stroke: #475569 !important; }
        .s9 { fill: #1e3a8a !important; }
        .s10 { fill: #065f46 !important; }
        .s11 { fill: #831843 !important; }
        .s12 { fill: #0e7490 !important; }
        .s13 { fill: #581c87 !important; }
        .s14 { fill: #334155 !important; }
        .s15 { fill: #78350f !important; }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawDark;
  }
}

/**
 * Builds custom electronic blueprint skin from dark skin:
 * - High-contrast electric cyan traces (#38bdf8)
 * - Bright ice-blue signal names (#7dd3fc)
 * - Technical CAD blue bus fills
 * - Crisp bright white-cyan titles
 */
function createBlueprintSkin(): unknown[] {
  try {
    const base = rawDark.length > 0 ? rawDark : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css = css.replace(/stroke:#ffffff/g, 'stroke:#38bdf8');
      css = css.replace(/stroke:#fff/g, 'stroke:#38bdf8');
      css = css.replace(/fill:#0041c4/g, 'fill:#38bdf8');
      css += `
        text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace, sans-serif !important; fill: #e0f2fe !important; }
        .info { fill: #7dd3fc !important; font-weight: 700 !important; }
        .muted, .muted text, text.muted { fill: #93c5fd !important; font-weight: 500 !important; }
        text[fill="#000"], text[fill="black"] { fill: #e0f2fe !important; font-weight: 700 !important; }
        /* High-contrast node tags and edge labels: remove white background box */
        g[id^="wavearcs"] rect, rect[style*="fill:#FFF"], rect[style*="fill:#fff"], rect[style*="fill:white"] {
          fill: #0c4a6e !important;
          stroke: #0284c7 !important;
          stroke-width: 0.8px !important;
          rx: 3px !important;
          ry: 3px !important;
        }
        g[id^="wavearcs"] text {
          fill: #38bdf8 !important;
          font-weight: 700 !important;
        }
        g[id^="wavearcs"] path {
          stroke: #38bdf8 !important;
        }
        marker#arrowhead path {
          fill: #38bdf8 !important;
          stroke: #38bdf8 !important;
        }
        .s8 { fill: #0c4a6e !important; stroke: #38bdf8 !important; }
        .s9 { fill: #075985 !important; }
        .s10 { fill: #0369a1 !important; }
        .s11 { fill: #0284c7 !important; }
        .s12 { fill: #0e7490 !important; }
        .s13 { fill: #155e75 !important; }
        .s14 { fill: #1e3a5f !important; }
        .s15 { fill: #0f2d59 !important; }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawDark;
  }
}

/**
 * Builds terminal matrix green skin from dark skin:
 * - Neon green phosphor traces (#22c55e)
 * - Bright lime signal names (#4ade80)
 * - Pure CRT phosphor green titles (#86efac)
 * - Matrix dark green bus fills
 */
function createMatrixSkin(): unknown[] {
  try {
    const base = rawDark.length > 0 ? rawDark : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css = css.replace(/stroke:#ffffff/g, 'stroke:#22c55e');
      css = css.replace(/stroke:#fff/g, 'stroke:#22c55e');
      css = css.replace(/fill:#0041c4/g, 'fill:#22c55e');
      css += `
        text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace, sans-serif !important; fill: #bbf7d0 !important; }
        .info { fill: #4ade80 !important; font-weight: 700 !important; }
        .muted, .muted text, text.muted { fill: #4ade80 !important; font-weight: 500 !important; }
        text[fill="#000"], text[fill="black"] { fill: #86efac !important; font-weight: 700 !important; }
        /* High-contrast node tags and edge labels: remove white background box */
        g[id^="wavearcs"] rect, rect[style*="fill:#FFF"], rect[style*="fill:#fff"], rect[style*="fill:white"] {
          fill: #052e16 !important;
          stroke: #15803d !important;
          stroke-width: 0.8px !important;
          rx: 3px !important;
          ry: 3px !important;
        }
        g[id^="wavearcs"] text {
          fill: #4ade80 !important;
          font-weight: 700 !important;
        }
        g[id^="wavearcs"] path {
          stroke: #22c55e !important;
        }
        marker#arrowhead path {
          fill: #22c55e !important;
          stroke: #22c55e !important;
        }
        .s8 { fill: #052e16 !important; stroke: #22c55e !important; }
        .s9 { fill: #064e3b !important; }
        .s10 { fill: #065f46 !important; }
        .s11 { fill: #047857 !important; }
        .s12 { fill: #14532d !important; }
        .s13 { fill: #166534 !important; }
        .s14 { fill: #022c15 !important; }
        .s15 { fill: #09381e !important; }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawDark;
  }
}

/**
 * Builds cyberpunk neon skin from dark skin.
 * Electric cyan traces, neon magenta text on deep purple obsidian.
 */
function createCyberpunkSkin(): unknown[] {
  try {
    const base = rawDark.length > 0 ? rawDark : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css = css.replace(/stroke:#ffffff/g, 'stroke:#06b6d4');
      css = css.replace(/stroke:#fff/g, 'stroke:#06b6d4');
      css = css.replace(/fill:#ffffff/g, 'fill:#f472b6');
      css = css.replace(/fill:#0041c4/g, 'fill:#f43f5e');
      css += `
        text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace, sans-serif !important; }
        .info { fill: #f472b6 !important; font-weight: 700 !important; }
        .muted, .muted text, text.muted { fill: #a855f7 !important; font-weight: 500 !important; }
        text[fill="#000"], text[fill="black"] { fill: #fdf2f8 !important; font-weight: 700 !important; }
        /* High-contrast node tags and edge labels: remove white background box */
        g[id^="wavearcs"] rect, rect[style*="fill:#FFF"], rect[style*="fill:#fff"], rect[style*="fill:white"] {
          fill: #3b0764 !important;
          stroke: #a855f7 !important;
          stroke-width: 0.8px !important;
          rx: 3px !important;
          ry: 3px !important;
        }
        g[id^="wavearcs"] text {
          fill: #f472b6 !important;
          font-weight: 700 !important;
        }
        g[id^="wavearcs"] path {
          stroke: #ec4899 !important;
        }
        marker#arrowhead path {
          fill: #ec4899 !important;
          stroke: #ec4899 !important;
        }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawDark;
  }
}

/**
 * Builds academic paper print skin from default skin.
 * Rich charcoal lines and serif feel on warm ivory parchment background.
 */
function createPaperSkin(): unknown[] {
  try {
    const base = rawDefault.length > 0 ? rawDefault : rawDark;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css = css.replace(/font-family:Helvetica/g, 'font-family:Georgia, Cambria, "Times New Roman", serif');
      css = css.replace(/stroke:#000/g, 'stroke:#1c1917');
      css = css.replace(/fill:#000/g, 'fill:#1c1917');
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawDefault;
  }
}

/**
 * Scales text down in narrow skin (step width 10 / cycle 20px)
 * Prevents bus data text like '0x80' and signal names from overflowing or colliding!
 */
function enhanceNarrowSkin(): unknown[] {
  try {
    const base = rawNarrow.length > 0 ? rawNarrow : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css += `
        text { font-size: 8pt !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; letter-spacing: -0.3px; }
        .info { font-size: 8.5pt !important; font-weight: 700 !important; }
        .h1 { font-size: 15pt !important; font-weight: bold !important; }
        .h2 { font-size: 13pt !important; font-weight: bold !important; }
        .h3 { font-size: 11pt !important; font-weight: bold !important; }
        .h4 { font-size: 9.5pt !important; font-weight: bold !important; }
        .h5 { font-size: 8.5pt !important; font-weight: bold !important; }
        .h6 { font-size: 7.5pt !important; font-weight: bold !important; }
        .muted, .muted text, text.muted { font-size: 7.5pt !important; }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawNarrow;
  }
}

/**
 * Scales text down in ultra-compact narrower skin (step width 5 / cycle 10px)
 * Keeps labels legible without overlapping adjacent cycles.
 */
function enhanceNarrowerSkin(): unknown[] {
  try {
    const base = rawNarrower.length > 0 ? rawNarrower : rawDefault;
    const skin = cloneSkin(base) as any[];
    if (skin && skin[2] && typeof skin[2][2] === 'string') {
      let css = skin[2][2];
      css += `
        text { font-size: 6.5pt !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; letter-spacing: -0.5px; }
        .info { font-size: 7.5pt !important; font-weight: 700 !important; }
        .h1 { font-size: 13pt !important; font-weight: bold !important; }
        .h2 { font-size: 11pt !important; font-weight: bold !important; }
        .h3 { font-size: 9.5pt !important; font-weight: bold !important; }
        .h4 { font-size: 8pt !important; font-weight: bold !important; }
        .h5 { font-size: 7pt !important; font-weight: bold !important; }
        .h6 { font-size: 6.5pt !important; font-weight: bold !important; }
        .muted, .muted text, text.muted { font-size: 6.5pt !important; }
      `;
      skin[2][2] = css;
    }
    return skin;
  } catch {
    return rawNarrower;
  }
}

export const rawEnhancedDark = enhanceDarkSkin();
export const rawBlueprint = createBlueprintSkin();
export const rawMatrix = createMatrixSkin();
export const rawCyberpunk = createCyberpunkSkin();
export const rawPaper = createPaperSkin();
export const rawEnhancedNarrow = enhanceNarrowSkin();
export const rawEnhancedNarrower = enhanceNarrowerSkin();

/**
 * Generates a fresh, unmutated skin dictionary for WaveDrom rendering.
 * WaveDrom mutates the skin template in-place during render, so cloning is essential.
 */
export function getFreshSkinDictionary(): Record<string, unknown> {
  return {
    default: cloneSkin(rawDefault),
    dark: cloneSkin(rawEnhancedDark),
    blueprint: cloneSkin(rawBlueprint),
    matrix: cloneSkin(rawMatrix),
    cyberpunk: cloneSkin(rawCyberpunk),
    paper: cloneSkin(rawPaper),
    lowkey: cloneSkin(rawLowkey),
    narrow: cloneSkin(rawEnhancedNarrow),
    narrower: cloneSkin(rawEnhancedNarrower),
  };
}

/**
 * Complete WaveDrom skin dictionary required by WaveDrom renderSignal.
 */
export const SKIN_DICTIONARY: Record<string, unknown> = getFreshSkinDictionary();

export const AVAILABLE_SKINS: SkinInfo[] = [
  {
    id: 'default',
    name: '经典象牙白',
    enName: 'Classic Light',
    category: 'light',
    bgColor: '#ffffff',
    viewportBgClass: 'bg-white',
    textColor: '#1e293b',
    accentColor: '#2563eb',
    desc: '标准黑色线条，柔和总线彩底，最适合标准技术文档与教学',
    enDesc: 'Standard crisp black lines on pure white canvas, ideal for docs and papers',
    tag: '经典默认',
    enTag: 'Default',
  },
  {
    id: 'dark',
    name: '深空极客黑',
    enName: 'Dark Tech',
    category: 'dark',
    bgColor: '#0f172a',
    viewportBgClass: 'bg-slate-900',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    desc: '纯黑背景与高对比亮白线条，夜间开发护眼极客风格',
    enDesc: 'Deep pitch-black canvas with high-contrast white waveform lines',
    tag: '暗色推荐',
    enTag: 'Dark Pick',
  },
  {
    id: 'blueprint',
    name: '电子工程蓝图',
    enName: 'Circuit Blueprint',
    category: 'dark',
    bgColor: '#0b1d3a',
    viewportBgClass: 'bg-[#0b1d3a]',
    textColor: '#e0f2fe',
    accentColor: '#38bdf8',
    desc: '经典电路设计图纸风格，深蓝底配电光青色时序线条',
    enDesc: 'Engineering blueprint style with cyan waveform lines on deep navy',
    tag: '工程师特色',
    enTag: 'Blueprint',
  },
  {
    id: 'matrix',
    name: '终端黑客绿',
    enName: 'Terminal Matrix',
    category: 'dark',
    bgColor: '#050d08',
    viewportBgClass: 'bg-[#050d08]',
    textColor: '#4ade80',
    accentColor: '#22c55e',
    desc: '纯黑底色与经典CRT荧光绿波形，极富科技感',
    enDesc: 'Pure black backdrop with phosphor green waveform traces',
    tag: '高对比度',
    enTag: 'High Contrast',
  },
  {
    id: 'cyberpunk',
    name: '霓虹赛博紫',
    enName: 'Cyberpunk Neon',
    category: 'dark',
    bgColor: '#120924',
    viewportBgClass: 'bg-[#120924]',
    textColor: '#f472b6',
    accentColor: '#06b6d4',
    desc: '深邃暗紫背景搭配电光青线与粉红文字，炫酷前卫',
    enDesc: 'Neon cyan & magenta pulses over deep violet background',
    tag: '赛博朋克',
    enTag: 'Cyberpunk',
  },
  {
    id: 'paper',
    name: '学术论文书卷',
    enName: 'Paper Journal',
    category: 'light',
    bgColor: '#faf8f5',
    viewportBgClass: 'bg-[#faf8f5]',
    textColor: '#1c1917',
    accentColor: '#b45309',
    desc: '温润米黄纸质底色与高精度纯炭黑线条，适合学术报告与顶刊排版',
    enDesc: 'Warm ivory paper tone with rich charcoal ink traces for publication',
    tag: '论文出版',
    enTag: 'Paper',
  },
  {
    id: 'lowkey',
    name: '优雅极简灰',
    enName: 'LowKey Gray',
    category: 'light',
    bgColor: '#f8fafc',
    viewportBgClass: 'bg-slate-50',
    textColor: '#334155',
    accentColor: '#64748b',
    desc: '柔和浅灰线条与低饱和色调，低调内敛',
    enDesc: 'Subtle slate gray tones with muted palette for minimal distraction',
    tag: '极简素雅',
    enTag: 'Minimalist',
  },
  {
    id: 'narrow',
    name: '紧凑窄行出版',
    enName: 'Narrow Print',
    category: 'compact',
    bgColor: '#ffffff',
    viewportBgClass: 'bg-white',
    textColor: '#1e293b',
    accentColor: '#0ea5e9',
    desc: '紧凑行高布局，有效节省版面空间，适合多信号紧凑排版',
    enDesc: 'Compact vertical height for dense technical paper column layouts',
    tag: '紧凑排版',
    enTag: 'Compact',
  },
  {
    id: 'narrower',
    name: '超窄高密全景',
    enName: 'Ultra Narrow',
    category: 'compact',
    bgColor: '#ffffff',
    viewportBgClass: 'bg-white',
    textColor: '#1e293b',
    accentColor: '#6366f1',
    desc: '超紧凑波形高度，适合信号较多时的全局概览',
    enDesc: 'Maximum signal density for bird-eye overview of large bus architectures',
    tag: '超高密度',
    enTag: 'Ultra Dense',
  },
];

export function getSkinInfo(skinName: WaveSkin | string = 'default'): SkinInfo {
  return AVAILABLE_SKINS.find((s) => s.id === skinName) || AVAILABLE_SKINS[0];
}
