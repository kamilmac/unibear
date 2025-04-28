import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/helpers.ts";

async function startServer(): Promise<void> {
  try {
    await initServer();
  } catch (err) {
    console.error("❌ failed to start server:", err);
  }
}

if (await handleCliArgs()) {
  Deno.exit(0);
}

startServer();

const { unmount } = render(<App />);

Deno.addSignalListener("SIGINT", () => {
  unmount();
  Deno.exit(0);
});
