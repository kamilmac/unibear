import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { useStore } from "./main.tsx";

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

    const textOverride = override || `Injected context: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`;
    useStore.getState().injectContext(text, textOverride);
    
    ctx.response.status = 200;
    ctx.response.body = { success: true, message: "Text injected successfully" };
  } catch (error) {
    console.error("Error injecting text:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to inject text" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:3000");
await app.listen({ port: 3000 });
