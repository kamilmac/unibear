import { PORT } from "./constants.ts";

// Function to check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    await fetch(`http://localhost:${port}`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export async function handleCliArgs(): Promise<boolean> {
  const args = Deno.args;
  if (!args[0]) return false;
  try {
    const response = await fetch(
      `http://localhost:${PORT}/command/${args[0]}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: args[1] || "",
      },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Server responded with ${response.status}: ${
          errorData.error || response.statusText
        }`,
      );
    }
    console.log(`Command ${args[0]} successfull`);
  } catch (error) {
    console.error(`Command ${args[0]} failed: `, error);
  }

  return true;
}

export const getContentFromFile = async (
  filePath: string,
): Promise<string | undefined> => {
  try {
    const fileContent = await Deno.readTextFile(filePath);
    return fileContent;
  } catch (error) {
    console.error("Error reading file: ", error);
  }
};

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
