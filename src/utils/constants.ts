import chalk from "npm:chalk";
import { basename } from "https://deno.land/std@0.205.0/path/mod.ts";
import { config } from "./config.ts";
import pkg from "../../deno.json" with { type: "json" };

export const VERSION = pkg.version;

export const OPENAI_MODEL = config.model ?? "o4-mini";
export const OPENAI_API_URL = Deno.env.get("OPENAI_API_URL") ?? "";
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? undefined;
export const OPENAI_WEB_SEARCH_MODEL = config.webSearchModel ?? "gpt-4.1-mini";

export const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? undefined;
export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/";
export const ANTHROPIC_MODEL = config.model ?? "claude-3-7-sonnet-20250219";
export const ANTHROPIC_WEB_SEARCH_MODEL = config.webSearchModel ??
  ANTHROPIC_MODEL;

export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? undefined;
export const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
export const GEMINI_MODEL = config.model ?? "gemini-2.5-flash-preview-04-17";
export const GEMINI_WEB_SEARCH_MODEL = config.webSearchModel ?? GEMINI_MODEL;

export const OLLAMA_BASE_URL = "http://localhost:11434/v1";

export const TEMPERATURE = config.temperature ?? 1;
export const PROVIDER = config.provider ?? "openai";
export const WORKSPACE_NAME = basename(Deno.cwd());

export const MAX_CHAT_HISTORY = 32; // trim history to last N messages
export const MAX_TOOL_ITERATIONS = 24;

export const KEY_BINDINGS = {
  moveDown: ["j"],
  moveUp: ["k"],
  bigMoveDown: ["J"],
  bigMoveUp: ["K"],
  yank: ["y"],
  select: ["v"],
  promptMode: ["i"],
  goToEnd: ["ge", "G"],
  goToTop: ["gg"],
  paste: ["p"],
  del: ["d"],
  useGitTools: [config.key_bindings?.useGitTools ?? ":"],
  useEditTools: [config.key_bindings?.useEditTools ?? "+"],
  useWebTools: [config.key_bindings?.useWebTools ?? "?"],
} as const;
export type KeyBindings = typeof KEY_BINDINGS;
export const TOOL_MODE_KEY_MAP: Record<string, ToolMode> = {
  [KEY_BINDINGS.useGitTools[0]]: "git",
  [KEY_BINDINGS.useEditTools[0]]: "edit",
  [KEY_BINDINGS.useWebTools[0]]: "web",
  default: "normal",
};
export const USER_LABEL = config.user_name ?? "USER";
export const AI_LABEL = "Bear";
export const PORT = config.port ?? 12496;
export const IS_DEV = Deno.env.get("DEV") === "true";
export const TEXT_AREA_HEIGHT = 7;
export const CURSOR_SCROLL_PADDING = 5;
export const BANNER_LONG = `
██╗   ██╗███╗  ██╗██╗██████╗░███████╗░█████╗░██████╗ 
██║░░░██║████╗░██║██║██╔══██╗██╔════╝██╔══██╗██╔══██╗
██║░░░██║██╔██╗██║██║██████╦╝█████╗░░███████║██████╔╝
██║░░░██║██║╚████║██║██╔══██╗██╔══╝░░██╔══██║██╔══██╗
╚██████╔╝██║░╚███║██║██████╦╝███████╗██║  ██║██║  ██║
░╚═════╝░╚═╝░░╚══╝╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
`;
export const LONG_BANNER_LINE_LENGTH = BANNER_LONG.split("\n")[0].length + 3;
export const BANNER_TINY = `
 (･ω･)
`;
export const BANNER = `
██╗   ██╗███╗  ██╗██╗
██║░░░██║████╗░██║██║
██║░░░██║██╔██╗██║██║
██║░░░██║██║╚████║██║
╚██████╔╝██║░╚███║██║
░╚═════╝░╚═╝░░╚══╝╚═╝
██████╗░███████╗░█████╗░██████╗ 
██╔══██╗██╔════╝██╔══██╗██╔══██╗
██████╦╝█████╗░░███████║██████╔╝
██╔══██╗██╔══╝░░██╔══██║██╔══██╗
██████╦╝███████╗██║  ██║██║  ██║
╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
`;
export const BANNER_A = `
uni ═══════════╗
██████╗░███████║
██╔══██╗██╔════╝
██████╦╝█████╗░░
██╔══██╗██╔══╝░░
██████╦╝███████╗
╚═════╝ ╚══════╝
░█████╗░██████╗ 
██╔══██╗██╔══██╗
███████║██████╔╝
██╔══██║██╔══██╗
██║  ██║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝`;
export const BANNER_B = `
╔═════════════uni═══════════╗
██████╗░███████╗░█████╗░██████═╗
██╔══██╗██╔════╝██╔══██╗██╔══██║
██████╦╝█████╗░░███████║██████╔╝
██╔══██╗██╔══╝░░██╔══██║██╔══██╗
██████╦╝███████╗██║  ██║██║  ██║
╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
`;
const HEX_COLORS = {
  white: "#ffffff",
  black: "#000000",
  green: "#00ff00",
  blue: "#0000ff",
  grey: "#999999",
  darkGrey: "#333333",
  lightGrey: "#cccccc",
  navy: "#2C3E50",
  teal: "#1ABC9C",
  skyBlue: "#3498DB",
  orange: "#E67E22",
  red: "#E74C3C",
  purple: "#9B59B6",
  greyLight: "#ECF0F1",
  greyDark: "#95A5A6",
};

const DARK_THEME = {
  prompt: chalk.bold.hex(HEX_COLORS.teal),
  ai: chalk.hex(HEX_COLORS.purple),
  visual: chalk.hex(HEX_COLORS.white),
  statusLineInactive: chalk.hex(HEX_COLORS.grey),
  statusLineActive: chalk.bgHex(HEX_COLORS.teal).hex(HEX_COLORS.black),
  banner: chalk.hex(HEX_COLORS.purple),
  border: HEX_COLORS.darkGrey,
  cursor: chalk.inverse,
  selectedLineBg: chalk.inverse,
};

const LIGHT_THEME = {
  ...DARK_THEME,
  border: HEX_COLORS.lightGrey,
  prompt: chalk.bold.hex(HEX_COLORS.navy),
};

export const COLORS = config.theme === "light" ? LIGHT_THEME : DARK_THEME;
export const SYSTEM = config.system ??
  `You’re a friendly AI programming assistant (called Unibear) with the chops of a senior engineer. Deliver concise, precise solutions—be direct, demand clarity when specs are vague, and season your replies with respectful wit and subtle sarcasm. Always provide readable, best-practice code. Always use markdown format for code blocks in your responses (pure and clean markdown and no comments), try to keep lines length below 80 characters. Use help tool whenever user asks for help.`;
