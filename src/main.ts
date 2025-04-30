import React from "npm:react";
import { render } from "npm:ink";
import { App } from "./components/App.tsx";
import { initServer } from "./api/server.ts";
import { handleCliArgs } from "./utils/helpers.ts";
import { PORT, THE_AI_NAME } from "./utils/constants.ts";

if (await handleCliArgs()) {
  Deno.exit(0);
}

initServer().catch((err) => {
  console.error(`
❌ Failed to start server on PORT: ${PORT}
You're probably running ${THE_AI_NAME} instance already.
You can still use it in CLI mode to pass context from external sources.\n
${err}
  `);
  Deno.exit(1);
});

const { unmount } = render(React.createElement(App));
Deno.addSignalListener("SIGINT", () => {
  unmount();
  Deno.exit(0);
});
