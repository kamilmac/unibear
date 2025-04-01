import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/cli.ts";

// Check CLI arguments first
const args = Deno.args;
handleCliArgs(args).then(handled => {
  if (!handled) {
    // Only start the server and render the app if we're not just injecting text
    initServer().catch((err) => {
      console.error("Failed to start server:", err);
    });
    
    render(React.createElement(App));
  } else {
    // Exit after handling the inject command
    Deno.exit(0);
  }
});
