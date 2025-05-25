import { ensureFile } from "https://deno.land/std@0.224.0/fs/ensure_file.ts";
import { join } from "https://deno.land/std@0.205.0/path/mod.ts";
import { getAppConfigDir } from "../utils/helpers.ts";

const APP_CONFIG_DIR = getAppConfigDir();

function getLogFilePath(): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return join(APP_CONFIG_DIR, "logs", `app-${today}.log`);
}

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  message: string;
  details?: unknown;
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    const logFilePath = getLogFilePath();
    await ensureFile(logFilePath);
    const logLine = JSON.stringify(entry) + "\n";
    await Deno.writeTextFile(logFilePath, logLine, { append: true });
  } catch (_error) {
    // swallow
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
