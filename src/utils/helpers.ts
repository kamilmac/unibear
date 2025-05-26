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
  } catch (error) {
    console.error(`Command ${args[0]} failed: `, error);
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
