import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import { getAppConfigDir } from "./helpers.ts";

export interface Config {
  provider?: "openai" | "anthropic" | "gemini" | "ollama";
  model?: string;
  reasoning_effort?: string;
  web_search_model?: string;
  temperature?: number;
  system?: string;
  port?: number;
  theme?: "light" | "dark";
  user_name?: string;
  key_bindings?: {
    useGitTools?: string;
    useEditTools?: string;
    useWebTools?: string;
  };
}

export const APP_DIR = getAppConfigDir();
const configPath = join(APP_DIR, "config.json");

let file: Partial<Config> = {};

try {
  const raw = await Deno.readTextFile(configPath);
  file = JSON.parse(raw);
} catch (error) {
  console.warn(`Failed to load config from ${configPath}:\n ${error}`);
  console.warn(`\nUsing default config\n`);
}

export const config: Config = { ...file };
