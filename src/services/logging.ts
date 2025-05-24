import { ensureFile } from "https://deno.land/std@0.224.0/fs/ensure_file.ts";
import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import { getAppConfigDir } from "../utils/helpers.ts";

const APP_CONFIG_DIR = getAppConfigDir();
const LOG_FILE_PATH = join(APP_CONFIG_DIR, "logs", "app.log");

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  message: string;
  details?: unknown;
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await ensureFile(LOG_FILE_PATH);
    const logLine = JSON.stringify(entry) + "\n";
    await Deno.writeTextFile(LOG_FILE_PATH, logLine, { append: true });
  } catch (error) {
    console.error("Failed to write to log file:", error);
    // Fallback or re-throw, depending on desired robustness
  }
}

export class Logger {
  private static async log(
    level: LogEntry["level"],
    message: string,
    details?: unknown,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    await writeLog({ timestamp, level, message, details });
  }

  static info(message: string, details?: unknown): void {
    Logger.log("INFO", message, details).catch(console.error);
  }

  static warning(message: string, details?: unknown): void {
    Logger.log("WARNING", message, details).catch(console.error);
  }

  static error(message: string, details?: unknown): void {
    Logger.log("ERROR", message, details).catch(console.error);
  }

  static debug(message: string, details?: unknown): void {
    // Optionally, make debug logging conditional (e.g., based on an env var)
    // if (Deno.env.get("LOG_LEVEL") === "DEBUG") {
    Logger.log("DEBUG", message, details).catch(console.error);
    // }
  }
}

// Example usage:
// Logger.info("Application started");
// Logger.error("Something went wrong", { error: new Error("Example error") });
