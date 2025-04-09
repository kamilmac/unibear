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
};

const DARK_THEME = {
  prompt: chalk.hex(HEX_COLORS.green),
  command: chalk.hex(HEX_COLORS.red),
  visual: chalk.hex(HEX_COLORS.blue),
  promptIndicator: chalk.bgHex(HEX_COLORS.green).hex(HEX_COLORS.black),
  commandIndicator: chalk.bgHex(HEX_COLORS.red).hex(HEX_COLORS.black),
  visualIndicator: chalk.bgHex(HEX_COLORS.blue).hex(HEX_COLORS.black),
  statusLineInactive: chalk.hex(HEX_COLORS.grey),
  statusLineActive: chalk.bgHex(HEX_COLORS.green).hex(HEX_COLORS.black),
  banner: chalk.hex(HEX_COLORS.red),
  text: HEX_COLORS.white,
  textDisabled: HEX_COLORS.grey,
  border: HEX_COLORS.darkGrey,
  cursor: HEX_COLORS.white,
  selectedLineBg: chalk.bgHex(HEX_COLORS.darkGrey),
};

export const COLORS = DARK_THEME;
