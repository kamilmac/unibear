import { Application, Router } from "jsr:@oak/oak";
import { useStore } from "../store/main.ts";
import { AI_LABEL, PORT, WORKSPACE_NAME } from "../utils/constants.ts";
import { Logger } from "../services/logging.ts"; // Added

// Initialize the server
export const initServer = async () => {
  Logger.info("Initializing server..."); // Added
  const app = new Application();
  const router = new Router();

  // Logging middleware
  app.use(async (ctx, next) => { // Added
    const start = Date.now(); // Added
    await next(); // Added
    const ms = Date.now() - start; // Added
    Logger.info( // Added
      `${ctx.request.method} ${ctx.request.url} - ${ctx.response.status} ${ms}ms`, // Added
      { // Added
        method: ctx.request.method, // Added
        url: ctx.request.url.pathname, // Added
        status: ctx.response.status, // Added
        duration: ms, // Added
      }, // Added
    ); // Added
  }); // Added

  router.post("/command/add_file", async (ctx) => {
    Logger.debug("Received /command/add_file request", {
      body: await ctx.request.body.text(),
      headers: ctx.request.headers,
    }); // Added - log body carefully
    try {
      // const workspaceName = basename(Deno.cwd());
      const headers = ctx.request.headers;
      const callersWorkspace = headers.get("workspace");
      const arg = await ctx.request.body.text(); // Reading body again, consider optimizing
      // allow the exact workspace or any nested child of it
      if (
        callersWorkspace === WORKSPACE_NAME ||
        callersWorkspace.startsWith(WORKSPACE_NAME + "/")
      ) {
        useStore.getState().addFileToContext(arg || "");
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: "Succesfully added file",
          arg,
        };
        Logger.info("Successfully added file via API", { file: arg }); // Added
      } else {
        const errorMsg =
          `${AI_LABEL} server is running in ${WORKSPACE_NAME} workspace. Request from ${callersWorkspace}`;
        Logger.warning(errorMsg, {
          requestedWorkspace: callersWorkspace,
          serverWorkspace: WORKSPACE_NAME,
        }); // Added
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      Logger.error("Failed to add file via API", {
        error: error.message,
        stack: error.stack,
      }); // Added
      ctx.response.status = 500;
      ctx.response.body = {
        error: "Failed to add file: " + error,
      };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  try { // Added
    await app.listen({ port: PORT });
    Logger.info(`Server listening on port ${PORT}`); // Added
  } catch (error: any) { // Added
    Logger.error("Failed to start server", {
      port: PORT,
      error: error.message,
      stack: error.stack,
    }); // Added
    throw error; // Re-throw to allow main.ts to handle it // Added
  } // Added
};
