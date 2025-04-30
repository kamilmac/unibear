export interface Config {
  model?: string;
  system?: string;
  port?: number;
  theme?: "light" | "dark";
  user_name?: string;
}

const xdg = Deno.env.get("XDG_CONFIG_HOME") ??
  `${Deno.env.get("HOME")}/.config`;
const path = `${xdg}/unibear/config.json`;

let file: Partial<Config> = {};

try {
  const raw = await Deno.readTextFile(path);
  file = JSON.parse(raw);
} catch (error) {
  console.warn(`Failed to load config from ${path}: ${error}`);
}

export const config: Config = { ...file };
