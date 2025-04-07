import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/cli.ts";
import { withFullScreen } from "npm:fullscreen-ink";

const args = Deno.args;
handleCliArgs(args).then((handled) => {
  if (!handled) {
    initServer().catch((err) => {
      console.error("Failed to start server:", err);
    });

    withFullScreen(React.createElement(App)).start();
    // render(React.createElement(App));
  } else {
    Deno.exit(0);
  }
});
