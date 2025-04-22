import { Application, Router } from "jsr:@oak/oak";
import { useStore } from "../store/index.ts";
import { PORT, THE_AI_NAME } from "../utils/constants.ts";
import { basename } from "https://deno.land/std@0.205.0/path/mod.ts";

// Initialize the server
export const initServer = async () => {
  const app = new Application();
  const router = new Router();

  router.post("/command/:command", async (ctx) => {
    try {
      // const workspaceName = basename(Deno.cwd());
      const headers = ctx.request.headers;
      const callersWorkspace = headers.get("workspace");
      const workspaceName = basename(Deno.cwd());
      const arg = await ctx.request.body.text();
      if (callersWorkspace === workspaceName) {
        useStore.getState().commands[ctx.params.command].process(arg || "");
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: "Succesfully parsed external command",
          arg,
        };
      } else {
        throw new Error(
          `${THE_AI_NAME} server is running in ${workspaceName} workspace.`,
        );
      }
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        error: "Failed to parse external command: " + error,
      };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  await app.listen({ port: PORT });
};
