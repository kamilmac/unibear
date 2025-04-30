import chalk from "npm:chalk";

export const TOOL_MODE_KEY_MAP: Record<string, ToolMode> = {
  ":": "git",
  "+": "edit",
  default: "normal",
};
export const THE_AI_NAME = "UNIBEAR";
export const PORT = 12492;
export const IS_DEV = Deno.env.get("DEV") === "true";
export const TEXT_AREA_HEIGHT = 6;
export const CURSOR_SCROLL_PADDING = 5;
export const BANNER = `
░  ░░░░  ░░   ░░░  ░░        ░          
▒  ▒▒▒▒  ▒▒    ▒▒  ▒▒▒▒▒  ▒▒▒▒          
▓  ▓▓▓▓  ▓▓  ▓  ▓  ▓▓▓▓▓  ▓▓▓▓          
█  ████  ██  ██    █████  ████          
██      ███  ███   ██        █          
░       ░░░        ░░░      ░░░       ░░
▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒  ▒
▓       ▓▓▓      ▓▓▓▓  ▓▓▓▓  ▓▓       ▓▓
█  ████  ██  ████████        ██  ███  ██
█       ███        ██  ████  ██  ████  █
                                                   `;
const HEX_COLORS = {
  white: "#ffffff",
  black: "#000000",
  green: "#00ff00",
  blue: "#0000ff",
  grey: "#999999",
  darkGrey: "#333333",
  lightGrey: "#cccccc",
  navy: "#2C3E50", // deep base
  teal: "#1ABC9C", // calm accent
  skyBlue: "#3498DB", // bright highlight
  orange: "#E67E22", // warm contrast
  red: "#E74C3C", // alert/danger
  purple: "#9B59B6", // secondary accent
  greyLight: "#ECF0F1", // backgrounds
  greyDark: "#95A5A6", // text/lines
};

const DARK_THEME = {
  prompt: chalk.bold.hex(HEX_COLORS.teal),
  ai: chalk.hex(HEX_COLORS.purple),
  visual: chalk.hex(HEX_COLORS.white),
  statusLineInactive: chalk.hex(HEX_COLORS.grey),
  statusLineActive: chalk.bgHex(HEX_COLORS.teal).hex(HEX_COLORS.black),
  banner: chalk.hex(HEX_COLORS.purple),
  border: HEX_COLORS.darkGrey,
  cursor: chalk.hex(HEX_COLORS.lightGrey),
  selectedLineBg: chalk.inverse,
};

const LIGHT_THEME = {
  ...DARK_THEME,
  border: HEX_COLORS.lightGrey,
  cursor: chalk.hex(HEX_COLORS.darkGrey),
};

export const COLORS = DARK_THEME;
export const SYSTEM =
  `You’re a friendly AI programming assistant (called Unibear) with the chops of a senior engineer. Deliver concise, precise solutions—be direct, demand clarity when specs are vague, and season your replies with respectful wit and subtle sarcasm. Always provide readable, best-practice code. Always use markdown format for code blocks in your responses (pure and clean markdown and no comments), try to keep lines length below 80 characters.`;
