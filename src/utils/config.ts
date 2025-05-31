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
}

export const APP_DIR = getAppConfigDir();
const configPath = join(APP_DIR, "config.json");

let file: Partial<Config> = {};

try {
  const raw = await Deno.readTextFile(configPath);
  file = JSON.parse(raw);
} catch (error: any) {
  // Config file doesn't exist or is invalid, use defaults
  console.warn(`Failed to load config from ${configPath}: ${error.message}. Using default config.`);
}

export const config: Config = { ...file };

// Function to save/update config (example, if you need it)
export async function updateConfig(newConfig: Partial<Config>): Promise<void> {
  try {
    const currentConfig = { ...config, ...newConfig };
    await Deno.mkdir(APP_DIR, { recursive: true });
    await Deno.writeTextFile(
      configPath,
      JSON.stringify(currentConfig, null, 2),
    );
    // Update in-memory config
    Object.assign(config, currentConfig);
    Object.assign(file, currentConfig);
  } catch (error: any) {
    console.error(`Failed to save config to ${configPath}:`, error);
  }
}
