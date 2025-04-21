import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/helpers.ts";

async function main() {
  // if CLI command was handled, we’re done
  if (await handleCliArgs()) {
    return Deno.exit(0);
  }

  // otherwise start the server (fire‐and‐forget)
  initServer().catch((err) => console.error("Failed to start server:", err));

  // render your Ink app
  render(React.createElement(App));
}

main();
