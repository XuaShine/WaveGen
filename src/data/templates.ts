import { ProtocolTemplate } from '../types';

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'blank',
    name: '空白波形画布 (Blank Canvas)',
    category: 'Basic',
    description: '干净纯粹的基础空白工程，预设包含 1 路主时钟与 1 路基础数据信号，自由从零设计',
    totalCycles: 12,
    signals: [
      {
        id: 'sig_clk_base',
        name: 'clk',
        wave: 'p...........',
        category: 'clock',
      },
      {
        id: 'sig_data_base',
        name: 'data_in',
        wave: '01.x=.01.zz.',
        data: ['IDLE', 'VALID'],
        category: 'bus',
      },
    ],
    edges: [],
    head: {
      text: '数字时序设计 (Timing Diagram)',
      tick: 0,
      every: 1,
    },
    foot: {
      text: '',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'spi_mode0',
    name: 'SPI Master (Mode 0)',
    category: 'Serial',
    description: '4-wire SPI timing diagram with CPOL=0, CPHA=0, 8-bit byte transfer on MOSI & MISO',
    totalCycles: 18,
    signals: [
      {
        id: 'spi_cs',
        name: 'CS# (SS)',
        wave: '10................1.',
        node: '..a..............b.',
      },
      {
        id: 'spi_sclk',
        name: 'SCLK',
        wave: '0.p.p.p.p.p.p.p.p.0.',
      },
      {
        id: 'spi_mosi',
        name: 'MOSI (Master Out)',
        wave: 'x.3.4.5.3.4.5.3.4.x.',
        data: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'],
      },
      {
        id: 'spi_miso',
        name: 'MISO (Slave In)',
        wave: 'z..4.5.3.4.5.3.4.5z.',
        data: ['Q7', 'Q6', 'Q5', 'Q4', 'Q3', 'Q2', 'Q1', 'Q0'],
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'a',
        arrow: '-~>',
        target: 'b',
        label: 'Active Frame Transfer',
      },
    ],
    head: {
      text: 'SPI Bus Transfer (Mode 0: CPOL=0, CPHA=0)',
      tick: 0,
      every: 2,
    },
    foot: {
      text: 'Sampled on rising edge, shifted on falling edge',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'i2c_write',
    name: 'I2C Single Byte Write',
    category: 'Serial',
    description: 'I2C START condition, 7-bit slave address, R/W=0, ACK, data byte, and STOP condition',
    totalCycles: 22,
    signals: [
      {
        id: 'i2c_scl',
        name: 'SCL',
        wave: '1.p.p.p.p.p.p.p.p.p.p.p.p.p.p.p.p.p.p.p.1.',
      },
      {
        id: 'i2c_sda',
        name: 'SDA',
        wave: '10.3.......40.5.......60.01.',
        data: ['Addr 0x48', 'W(0)', 'ACK', 'Byte 0xA5', 'ACK'],
        node: '.a.......................b.',
      },
    ],
    edges: [
      {
        id: 'e_start',
        source: 'a',
        arrow: '-|',
        target: 'b',
        label: 'START ... STOP',
      },
    ],
    head: {
      text: 'I2C Standard-mode Byte Write Sequence',
      tick: 0,
    },
    foot: {
      text: 'Open-drain SDA pull-up with ACK pulled low by slave',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'uart_8n1',
    name: 'UART 8N1 Frame',
    category: 'Serial',
    description: 'Standard asynchronous serial transmission (Idle, 1 Start Bit, 8 Data Bits LSB first, 1 Stop Bit)',
    totalCycles: 12,
    signals: [
      {
        id: 'uart_tx',
        name: 'TX Pin',
        wave: '1.0.3.4.5.3.4.5.3.4.1...',
        data: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
        node: '..s.................e...',
      },
    ],
    edges: [
      {
        id: 'uart_frame',
        source: 's',
        arrow: '<->',
        target: 'e',
        label: '10-baud Frame',
      },
    ],
    head: {
      text: 'UART 8N1 Asynchronous Frame Structure',
      tick: 0,
    },
    foot: {
      text: 'Baud Rate Period = 1/Baud (LSB First)',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'axi4_write',
    name: 'AXI4 Write Transaction',
    category: 'Bus',
    description: 'Full write address channel, write data channel, and write response channel handshake',
    totalCycles: 16,
    signals: [
      {
        id: 'axi_aclk',
        name: 'ACLK',
        wave: 'p...............',
      },
      {
        id: 'axi_awvalid',
        name: 'AWVALID',
        wave: '0.1...0.........',
        node: '..a...b.........',
      },
      {
        id: 'axi_awready',
        name: 'AWREADY',
        wave: '0...1.0.........',
      },
      {
        id: 'axi_awaddr',
        name: 'AWADDR',
        wave: 'x.3...x.........',
        data: ['0x8000_0000'],
      },
      {
        id: 'spacer1',
        name: '',
        wave: '',
        isSpacer: true,
      },
      {
        id: 'axi_wvalid',
        name: 'WVALID',
        wave: '0...1.....0.....',
        node: '....c.....d.....',
      },
      {
        id: 'axi_wready',
        name: 'WREADY',
        wave: '0.....1...0.....',
      },
      {
        id: 'axi_wdata',
        name: 'WDATA',
        wave: 'x...4.5...x.....',
        data: ['0x11223344', '0x55667788'],
      },
      {
        id: 'axi_wlast',
        name: 'WLAST',
        wave: '0.....1...0.....',
      },
      {
        id: 'spacer2',
        name: '',
        wave: '',
        isSpacer: true,
      },
      {
        id: 'axi_bvalid',
        name: 'BVALID',
        wave: '0.........1...0.',
      },
      {
        id: 'axi_bready',
        name: 'BREADY',
        wave: '0.........1.....',
      },
      {
        id: 'axi_bresp',
        name: 'BRESP',
        wave: 'x.........3...x.',
        data: ['OKAY'],
      },
    ],
    edges: [
      {
        id: 'e_aw',
        source: 'a',
        arrow: '->',
        target: 'b',
        label: 'Addr Handshake',
      },
      {
        id: 'e_w',
        source: 'c',
        arrow: '->',
        target: 'd',
        label: 'Data Burst',
      },
    ],
    head: {
      text: 'AXI4 Address & Data Write Channels with Response',
      tick: 0,
      every: 2,
    },
    foot: {
      text: 'Independent channels with VALID/READY handshake',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'apb_transfer',
    name: 'APB Bus Transfer',
    category: 'Bus',
    description: 'AMBA APB read and write state phases (IDLE, SETUP, ACCESS with PREADY)',
    totalCycles: 10,
    signals: [
      {
        id: 'apb_pclk',
        name: 'PCLK',
        wave: 'p.........',
      },
      {
        id: 'apb_psel',
        name: 'PSEL',
        wave: '0.1.....0.',
        node: '..s.....e.',
      },
      {
        id: 'apb_penable',
        name: 'PENABLE',
        wave: '0..1....0.',
      },
      {
        id: 'apb_pwrite',
        name: 'PWRITE',
        wave: '0.1.....0.',
      },
      {
        id: 'apb_paddr',
        name: 'PADDR',
        wave: 'x.3.....x.',
        data: ['0x4000_1000'],
      },
      {
        id: 'apb_pwdata',
        name: 'PWDATA',
        wave: 'x.4.....x.',
        data: ['0xDEADBEEF'],
      },
      {
        id: 'apb_pready',
        name: 'PREADY',
        wave: '0...1...0.',
      },
    ],
    edges: [
      {
        id: 'e_apb',
        source: 's',
        arrow: '<->',
        target: 'e',
        label: 'APB Access Phase',
      },
    ],
    head: {
      text: 'AMBA APB3/APB4 Write Transfer Timing',
      tick: 0,
    },
    foot: {
      text: 'SETUP on T1, ACCESS on T2, wait state extended if PREADY=0',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'clock_divider',
    name: 'Clock Dividers (÷2, ÷4)',
    category: 'Clock',
    description: 'Synchronous clock division, duty cycle demonstration, and phase relationships',
    totalCycles: 16,
    signals: [
      {
        id: 'clk_in',
        name: 'CLK_IN (f0)',
        wave: 'p...............',
      },
      {
        id: 'clk_div2',
        name: 'CLK_DIV2 (f0/2)',
        wave: '1.0.1.0.1.0.1.0.',
      },
      {
        id: 'clk_div4',
        name: 'CLK_DIV4 (f0/4)',
        wave: '1...0...1...0...',
      },
      {
        id: 'clk_inv',
        name: 'CLK_INV (Inverted)',
        wave: 'n...............',
      },
    ],
    head: {
      text: 'Clock Division and Multi-Phase Timing',
      tick: 0,
      every: 2,
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'ram_sync',
    name: 'SRAM Synchronous Read/Write',
    category: 'Memory',
    description: 'Synchronous single-port RAM write followed by read access with output valid pipeline',
    totalCycles: 12,
    signals: [
      {
        id: 'ram_clk',
        name: 'CLK',
        wave: 'p...........',
      },
      {
        id: 'ram_ce',
        name: 'CE#',
        wave: '10.........1',
      },
      {
        id: 'ram_we',
        name: 'WE#',
        wave: '10...1.....1',
        node: '..w..r......',
      },
      {
        id: 'ram_addr',
        name: 'ADDR[15:0]',
        wave: 'x.3.4.5.6..x',
        data: ['0x00A0', '0x00A2', '0x00B0', '0x00B2'],
      },
      {
        id: 'ram_din',
        name: 'DIN[7:0]',
        wave: 'x.3.4.x.....',
        data: ['0x55', '0xAA'],
      },
      {
        id: 'ram_dout',
        name: 'DOUT[7:0]',
        wave: 'z.....5.6..z',
        data: ['0x12', '0x34'],
      },
    ],
    edges: [
      {
        id: 'e_wr',
        source: 'w',
        arrow: '-~>',
        target: 'r',
        label: 'Write Burst -> Read Latency',
      },
    ],
    head: {
      text: 'Synchronous SRAM Read & Write Cycle',
      tick: 0,
    },
    foot: {
      text: 'Read data appears 1 clock cycle after address registered',
    },
    config: {
      hscale: 1,
      skin: 'default',
    },
  },
  {
    id: 'setup_hold_window',
    name: '建立保持时间窗口分析 (Setup & Hold)',
    category: 'Timing',
    description: '数字电路关键路径建立时间 t_setup 与保持时间 t_hold 窗口裕量及采样延时分析',
    totalCycles: 14,
    signals: [
      {
        id: 'sh_clk',
        name: 'CLK (参考时钟)',
        wave: '0.p.p.p.p.p.0.',
        node: '......a.......',
      },
      {
        id: 'sh_din',
        name: 'DATA (输入数据)',
        wave: 'x..3......4.x.',
        data: ['D_IN (有效数据)', '下一数据'],
        node: '...b.....c....',
      },
      {
        id: 'sh_window',
        name: 'MARGIN (裕量窗口)',
        wave: 'x..4...5..x...',
        data: ['t_su 建立', 't_h 保持'],
      },
      {
        id: 'sh_q',
        name: 'Q (寄存器输出)',
        wave: '0.....1.......',
      },
    ],
    edges: [
      {
        id: 'e_tsu',
        source: 'b',
        arrow: '~>',
        target: 'a',
        label: 't_setup ≥ 2.5ns',
      },
      {
        id: 'e_th',
        source: 'a',
        arrow: '~>',
        target: 'c',
        label: 't_hold ≥ 1.5ns',
      },
    ],
    head: {
      text: '触发器建立与保持时间窗口规范 (Setup & Hold Timing Margins)',
      tick: 0,
      every: 1,
    },
    foot: {
      text: '[时序规范]: 1 tick = 1.25 ns (800MHz 基准) · 数据在时钟有效沿前满足 t_setup，沿后满足 t_hold',
    },
    config: {
      hscale: 2,
      skin: 'default',
    },
  },
];
