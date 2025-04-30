import { Application, Router } from "jsr:@oak/oak";
import { useStore } from "../store/main.ts";
import { PORT, THE_AI_NAME, WORKSPACE_NAME } from "../utils/constants.ts";
import { basename } from "https://deno.land/std@0.205.0/path/mod.ts";

// Initialize the server
export const initServer = async () => {
  const app = new Application();
  const router = new Router();

  router.post("/command/add_file", async (ctx) => {
    try {
      // const workspaceName = basename(Deno.cwd());
      const headers = ctx.request.headers;
      const callersWorkspace = headers.get("workspace");
      const arg = await ctx.request.body.text();
      if (callersWorkspace === WORKSPACE_NAME) {
        useStore.getState().addFileToContext(arg || "");
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: "Succesfully added file",
          arg,
        };
      } else {
        throw new Error(
          `${THE_AI_NAME} server is running in ${WORKSPACE_NAME} workspace.`,
        );
      }
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        error: "Failed to add file: " + error,
      };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  await app.listen({ port: PORT });
};
