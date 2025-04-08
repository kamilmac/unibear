export const PORT = 12492;
export const COMMAND_PREFIX = "/";
export const IS_DEV = Deno.env.get("DEV") === "true";

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
  **/toggle_git_diff** -> attach git diff with your base (master|main) branch to context  
  **/clear** -> clear whole context and history
  **/help** -> you are here you majestic donkey
`;
