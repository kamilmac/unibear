import chalk from "npm:chalk";

export const PORT = 12492;
export const COMMAND_PREFIX = ":";
export const IS_DEV = Deno.env.get("DEV") === "true";
export const TEXT_AREA_HEIGHT = 6;
export const CURSOR_SCROLL_PADDING = 5;
export const BANNER = `
▓█████▄  ▒█████   ███▄    █  ██ ▄█▀▓█████ ▓█████ 
▒██▀ ██▌▒██▒  ██▒ ██ ▀█   █  ██▄█▒ ▓█   ▀ ▓█   ▀ 
░██   █▌▒██░  ██▒▓██  ▀█ ██▒▓███▄░ ▒███   ▒███   
░▓█▄   ▌▒██   ██░▓██▒  ▐▌██▒▓██ █▄ ▒▓█  ▄ ▒▓█  ▄ 
░▒████▓ ░ ████▓▒░▒██░   ▓██░▒██▒ █▄░▒████▒░▒████▒
 ▒▒▓  ▒ ░ ▒░▒░▒░ ░ ▒░   ▒ ▒ ▒ ▒▒ ▓▒░░ ▒░ ░░░ ▒░ ░
 ░ ▒  ▒   ░ ▒ ▒░ ░ ░░   ░ ▒░░ ░▒ ▒░ ░ ░  ░ ░ ░  ░
 ░ ░  ░ ░ ░ ░ ▒     ░   ░ ░ ░ ░░ ░    ░      ░   
   ░        ░ ░           ░ ░  ░      ░  ░   ░  ░
 ░                                               
`;
export const HELP_TEXT = `
  ## Supported commands:
  **:toggle_git_diff** -> attach git diff with your base (master|main) branch to context  
  **:clear** -> clear whole context and history
  **:help** -> you are here you majestic donkey
`;
const HEX_COLORS = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
  grey: "#999999",
  darkGrey: "#333333",
  lightGrey: "#cccccc",
};

const DARK_THEME = {
  prompt: chalk.bold.hex(HEX_COLORS.green),
  command: chalk.hex(HEX_COLORS.red),
  visual: chalk.hex(HEX_COLORS.white),
  statusLineInactive: chalk.hex(HEX_COLORS.grey),
  statusLineActive: chalk.bgHex(HEX_COLORS.green).hex(HEX_COLORS.black),
  banner: chalk.hex(HEX_COLORS.red),
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
