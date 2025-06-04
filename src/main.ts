import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/helpers.ts";
import { AI_LABEL, initializeTheme, PORT } from "./utils/constants.ts";

if (await handleCliArgs()) {
  Deno.exit(0);
}

initServer().catch((err) => {
  console.error(`
❌ Failed to start server on PORT: ${PORT}
You're probably running ${AI_LABEL} instance already.
You can still use it in CLI mode to pass context from external sources:

> unibear add_file <file_path>

---

${err}
  `);
  Deno.exit(1);
});

// Initialize theme before rendering the app
await initializeTheme();

const { unmount } = render(React.createElement(App));
Deno.addSignalListener("SIGINT", () => {
  unmount();
  Deno.exit(0);
});
