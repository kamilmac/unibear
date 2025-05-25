import chalk from "npm:chalk";
import { basename } from "https://deno.land/std@0.205.0/path/mod.ts";
import { config } from "./config.ts";
import pkg from "../../deno.json" with { type: "json" };

export const VERSION = pkg.version;

export const TEMPERATURE = config.temperature ?? 1;
export const WORKSPACE_NAME = basename(Deno.cwd());

export const MAX_CHAT_HISTORY = 32; // trim history to last N messages
export const MAX_TOOL_ITERATIONS = 64;
export const MAX_SIZE = 100_000; // max allowed file-size in bytes

export const PROVIDER = config.provider ?? "openai";

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
  useModifyTools: [config.key_bindings?.useModifyTools ?? "+"],
} as const;
export type KeyBindings = typeof KEY_BINDINGS;
export const TOOL_MODE_KEY_MAP: Record<string, ToolMode> = {
  [KEY_BINDINGS.useModifyTools[0]]: "modify",
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
  tool: chalk.hex(HEX_COLORS.grey),
  selectedLineBg: chalk.inverse,
};

const LIGHT_THEME = {
  ...DARK_THEME,
  border: HEX_COLORS.lightGrey,
  prompt: chalk.bold.hex(HEX_COLORS.navy),
};

export const COLORS = config.theme === "light" ? LIGHT_THEME : DARK_THEME;

export const SYSTEM_PROVIDER_EXTENSION: Record<string, string> = {
  gemini: `
You are proactive and confident. Instead of asking for permission, you move on with the task best suited to your work. You use available tools to get what you need without asking for permission.
You aim to be autonomous and to solve the task with help of available tools without asking too many questions.
**Tool Utilization:**
When prompted to do coding related task:
1. Use following tools to get relevant context:
git_list_local_modified_files > search_files > search_content (use this when looking for specific string that is not a filename)
2. Go through available context and create working plan.
3. Execute Your plan as best as you can without disrupting the user.
`,
};

export const SYSTEM = config.system ??
  `You’re a friendly AI programming assistant (called Unibear) with the chops of a senior engineer. Deliver concise, precise solutions—be direct, demand clarity when specs are vague, and season your replies with respectful wit and subtle sarcasm. Always provide readable, best-practice code and prioritize compact code changes instead of doing big blocks. Never return whole files to the user, instead show only relevant changes in markdown format (always use markdown for code). Always use markdown format for code blocks in your responses (pure and clean markdown and no comments), try to keep lines length below 80 characters. If prompt is about coding but doesn't mention files, use git_list_local_modified_files tool first. Use help tool whenever user asks for help.${
    SYSTEM_PROVIDER_EXTENSION[PROVIDER] ?? ""
  } NEVER USE GIT COMMIT TOOL YOURSELF, UNLESS PROMPTED BY USER.
  `;
