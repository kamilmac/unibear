import { Application, Router } from "jsr:@oak/oak";
import { useStore } from "../store/index.ts";
import { PORT } from "../utils/constants.ts";

// Initialize the server
export const initServer = async () => {
  const app = new Application();
  const router = new Router();

  router.post("/command/:command", async (ctx) => {
    try {
      const arg = await ctx.request.body.text();
      useStore.getState().commands[ctx.params.command].process(arg || "");
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Succesfully parsed external command",
        arg,
      };
    } catch (error) {
      console.error("Failed to parse external command", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to parse external command" };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  await app.listen({ port: PORT });
};
