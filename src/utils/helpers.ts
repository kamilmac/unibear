import { basename, join } from "https://deno.land/std@0.205.0/path/mod.ts";
import { PORT, VERSION } from "./constants.ts";

export async function handleCliArgs(): Promise<boolean> {
  const args = Deno.args;
  if (!args[0]) return false;
  if (["-v", "--version"].includes(args[0])) {
    console.log("Version: ", VERSION);
    return true;
  }
  const workspaceName = basename(Deno.cwd());
  try {
    const response = await fetch(
      `http://localhost:${PORT}/command/${args[0]}`,
      {
        method: "POST",
        headers: {
          "workspace": workspaceName,
          "Content-Type": "application/json",
        },
        body: args[1] || "",
      },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || response.statusText);
    }
    console.log(`Command ${args[0]} successfull`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Command ${args[0]} failed: `, errorMessage);
  }

  return true;
}

export const countTokens = (str: string): number => {
  return str
    .split("  ")
    .filter((char) => char !== " ")
    .join("").length / 3.7;
};

export const quit = () => {
  Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?1049l"));
  Deno.exit(0);
};

export const fileExists = async (
  path: string,
): Promise<boolean> => {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
};

export function getAppConfigDir(): string {
  if (Deno.build.os === "windows") {
    const appData = Deno.env.get("APPDATA") ??
      join(Deno.env.get("HOME") || "", "AppData", "Roaming");
    return join(appData, "unibear");
  }
  const xdg = Deno.env.get("XDG_CONFIG_HOME") ??
    join(Deno.env.get("HOME") || "", ".config");
  return join(xdg, "unibear");
}

export async function detectSystemTheme(): Promise<"light" | "dark"> {
  try {
    const os = Deno.build.os;

    if (os === "darwin") {
      const cmd = new Deno.Command("defaults", {
        args: ["read", "-g", "AppleInterfaceStyle"],
        stdout: "piped",
        stderr: "piped",
      });
      const result = await cmd.output();
      const output = new TextDecoder().decode(result.stdout).trim();
      return output === "Dark" ? "dark" : "light";
    }

    if (os === "windows") {
      const cmd = new Deno.Command("reg", {
        args: [
          "query",
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
          "/v",
          "AppsUseLightTheme",
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const result = await cmd.output();
      const output = new TextDecoder().decode(result.stdout);
      return output.includes("0x0") ? "dark" : "light";
    }

    if (os === "linux") {
      const cmd = new Deno.Command("gsettings", {
        args: ["get", "org.gnome.desktop.interface", "gtk-theme"],
        stdout: "piped",
        stderr: "piped",
      });
      const result = await cmd.output();
      const output = new TextDecoder().decode(result.stdout).toLowerCase();
      return output.includes("dark") ? "dark" : "light";
    }
  } catch {
    // Fallback to dark theme if detection fails
  }

  return "dark";
}
