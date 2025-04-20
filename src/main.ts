import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { PORT } from "./utils/constants.ts";
import { useStore } from "./store/index.ts";

const args = Deno.args;
handleCliArgs(args).then((handled) => {
  if (!handled) {
    initServer().catch((err) => {
      console.error("Failed to start server:", err);
    });

    render(React.createElement(App));
  } else {
    Deno.exit(0);
  }
});

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

export async function handleCliArgs(args: string[]): Promise<boolean> {
  const injectFileIndex = args.findIndex((arg) => arg === "inject-file");
  // Handle inject file command
  if (injectFileIndex >= 0 && injectFileIndex < args.length - 1) {
    const filePath = args[injectFileIndex + 1];
    const serverRunning = await isPortInUse(PORT);

    if (serverRunning) {
      useStore.getState().commands["inject-file"].process(filePath);
      return true;
    }
  }

  return false;
}
