import { Application, Router } from "jsr:@oak/oak";
import { useStore } from "../store/index.ts";

// Initialize the server
export const initServer = async () => {
  const app = new Application();
  const router = new Router();

  // POST endpoint to inject text
  router.post("/inject/text", async (ctx) => {
    try {
      const body = await ctx.request.body.json();
      const { text, override } = body;

      if (!text) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Missing 'text' field in request body" };
        return;
      }

      const textOverride = override ||
        `Injected context: ${text.substring(0, 20)}${
          text.length > 20 ? "..." : ""
        }`;
      useStore.getState().injectContext(text, textOverride);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Text injected successfully",
      };
    } catch (error) {
      console.error("Error injecting text:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to inject text" };
    }
  });

  // POST endpoint to inject file content
  router.post("/inject/file", async (ctx) => {
    try {
      const body = await ctx.request.body.json();
      const { filePath } = body;

      if (!filePath) {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Missing 'filePath' field in request body",
        };
        return;
      }

      try {
        // Read the file content
        const fileContent = await Deno.readTextFile(filePath);

        // Create a meaningful override message
        const fileName = filePath.split("/").pop();
        const textOverride = `Injected file: ${fileName}`;

        // Inject the file content into the chat
        useStore.getState().injectContext(fileContent, textOverride);

        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: "File content injected successfully",
          fileName,
        };
      } catch (error) {
        ctx.response.status = 404;
        ctx.response.body = {
          error: `Failed to read file: ${error}`,
          filePath,
        };
      }
    } catch (error) {
      console.error("Error injecting file:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to inject file" };
    }
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  await app.listen({ port: 3000 });
};
