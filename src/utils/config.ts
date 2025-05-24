import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import { getAppConfigDir } from "./helpers.ts";
import { Logger } from "../services/logging.ts"; // Added

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
  Logger.info("Loading config file", { path: configPath }); // Added
  const raw = await Deno.readTextFile(configPath);
  file = JSON.parse(raw);
  Logger.info("Config file loaded successfully", {
    path: configPath,
    data: file,
  }); // Added
} catch (error: any) {
  Logger.warning(
    `Failed to load config from ${configPath}: ${error.message}. Using default config.`,
    { path: configPath, error: error.message },
  ); // Modified
  // console.warn(`Failed to load config from ${configPath}:\n ${error}`);
  // console.warn(`\nUsing default config\n`);
}

export const config: Config = { ...file };

// Function to save/update config (example, if you need it)
export async function updateConfig(newConfig: Partial<Config>): Promise<void> {
  try {
    Logger.info("Updating config file", { path: configPath, newConfig }); // Added
    const currentConfig = { ...config, ...newConfig }; // Merge with existing or default config
    await Deno.mkdir(APP_DIR, { recursive: true });
    await Deno.writeTextFile(
      configPath,
      JSON.stringify(currentConfig, null, 2),
    );
    // Update in-memory config
    Object.assign(config, currentConfig);
    Object.assign(file, currentConfig); // also update the 'file' let for consistency if re-read
    Logger.info("Config file updated successfully", {
      path: configPath,
      updatedConfig: currentConfig,
    }); // Added
  } catch (error) {
    Logger.error("Failed to update config file", {
      path: configPath,
      error: error.message,
    }); // Added
    console.error(`Failed to save config to ${configPath}:`, error);
  }
}

// Example of logging when a new config would be created if it doesn't exist
// This would typically be called at startup if the initial try-catch fails and you want to persist defaults.
async function ensureDefaultConfigExists() {
  try {
    await Deno.stat(configPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      Logger.info("Config file not found. Creating with default values.", {
        path: configPath,
      });
      await updateConfig({}); // Save empty config, which will persist defaults or current 'file'
    } else {
      Logger.error("Error checking for config file", {
        path: configPath,
        error: error.message,
      });
    }
  }
}

// Call it once at startup if you want to ensure a default config is written when none exists
// ensureDefaultConfigExists(); // Uncomment to enable this behavior
