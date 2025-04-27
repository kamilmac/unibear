import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsRequestSchema } from "npm:@modelcontextprotocol/sdk/types.js";

// const mcpProc = new Deno.Command("deno", {
//   args: [
//     "npx",
//     "mcp-server-filesystem",
//     "./",
//   ],
//   stdin: "piped",
//   stdout: "piped",
// });

const cmd = {
  command: "npx",
  args: ["mcp-server-filesystem", "/Users/kmacinski/dev/logan"],
};
// 2) hook up the MCP client
export const mcpClient = new Client({ name: "app", version: "1.0.0" });
await mcpClient.connect(new StdioClientTransport(cmd));

// 3) fetch the tool list
const { tools } = await mcpClient.listTools(
  ListToolsRequestSchema,
  {},
);

// 4) map to OpenAI function defs
export const functions = tools.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.inputSchema,
}));

// the OpenAI client
// const openai = new OpenAI({
//   apiKey: Deno.env.get("OPENAI_API_KEY"),
// });

// async function makeOpenAIWithMCP() {
//   // wrapper that handles function calls
//   async function chatWithTools(msgs) {
//     const res = await openai.chat.completions.create({
//       model: "o4-mini",
//       messages: msgs,
//       functions,
//       function_call: "auto",
//     });

//     const choice = res.choices[0].message!;
//     if (choice.function_call) {
//       const name = choice.function_call.name;
//       const args = JSON.parse(choice.function_call.arguments!);

//       // 5) dispatch to MCP
//       const toolRes = await mcpClient.callTool(
//         CallToolRequestSchema,
//         { name, arguments: args },
//       );

//       // re-feed into OpenAI
//       const followup = await openai.chat.completions.create({
//         model: "o4-mini",
//         messages: [
//           ...msgs,
//           choice,
//           {
//             role: "function",
//             name,
//             content: toolRes.content[0].text,
//           },
//         ],
//       });

//       return followup.choices[0].message!.content;
//     }

//     return choice.content;
//   }

//   return { chatWithTools };
// } // usage

// (async () => {
//   const { chatWithTools } = await makeOpenAIWithMCP();
//   const reply = await chatWithTools([
//     { role: "user", content: "Read /some/allowed/dir/foo.txt" },
//   ]);
//   console.log(reply);
// })();
