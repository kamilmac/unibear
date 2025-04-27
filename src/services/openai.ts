import { OpenAI } from "npm:openai";
import { SYSTEM } from "../utils/constants.ts";
import { functions, mcpClient } from "./mcp.ts";

import { CallToolRequestSchema } from "npm:@modelcontextprotocol/sdk/types.js";

const MODEL = "o4-mini";
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface SendChatOpts {
  model?: string;
  stream?: boolean;
  onData?: (chunk: string) => void;
}

// async function getWeather(latitude: string, longitude: string) {
//   const response = await fetch(
//     `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`,
//   );
//   const data = await response.json();
//   return data.current.temperature_2m;
// }

// const tools = [{
//   "type": "function",
//   "name": "get_weather",
//   "description": "Get current temperature for a given location.",
//   "parameters": {
//     "type": "object",
//     "properties": {
//       "latitude": { "type": "number" },
//       "longitude": { "type": "number" },
//     },
//     "required": ["latitude", "longitude"],
//     "additionalProperties": false,
//   },
// }];

async function sendChat(
  messages: OpenAI.ChatCompletionMessageParam[],
  opts: SendChatOpts = {},
): Promise<string> {
  const model = opts.model || MODEL;

  let fnName = "";
  let fnArgs = "";
  let id = "";
  let firstContent = "";
  if (opts.stream && opts.onData) {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      // functions,
      tools: functions,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      // opts.onData(JSON.stringify(chunk));
      // opts.onData("\n");
      if (delta.tool_calls) {
        fnName ||= delta.tool_calls[0].function.name || "";
        fnArgs += delta.tool_calls[0].function.arguments || "";
        id = id || delta.tool_calls[0].id;
        // opts.onData("\n\n");
        // opts.onData(id);
        continue;
      }
      const content = delta?.content;
      if (content) {
        opts.onData(content);
        firstContent += content;
      }
    }
    if (fnName) {
      const args = JSON.parse(fnArgs);
      // opts.onData("TOOL CALL FOUND");
      // opts.onData(fnName);
      // opts.onData(fnArgs);
      // opts.onData(
      //   JSON.stringify(
      //     await mcpClient.callTool({ name: "list_allowed_directories" }),
      //   ),
      // );
      const result = await mcpClient.callTool(
        { name: fnName, arguments: args },
      );

      // 3) second streaming call with function result
      const round2: OpenAI.ChatCompletionMessageParam[] = [
        ...messages,
        {
          role: "assistant",
          content: firstContent,
          tool_calls: [{
            id,
            function: {
              arguments: fnArgs,
              name: fnName,
            },
            type: "function",
          }],
        },
        { role: "tool", tool_call_id: id, content: result.content[0].text },
      ];
      // const round2 = [
      //   ...messages,
      //   {
      //     role: "assistant",
      //     tool_calls: [{
      //       id: "1",
      //       function: fnName,
      //       type: "function",
      //     }],
      //     content: firstContent,
      //   },
      //   { role: "tool", name: fnName, content: result.content[0].text },
      // ];
      const stream2 = await openai.chat.completions.create({
        model,
        messages: round2,
        stream: true,
      });
      // try {
      // } catch (err) {
      //   opts.onData(JSON.stringify(err));
      // }
      for await (const chunk of stream2) {
        // opts.onData(JSON.stringify(chunk));
        // opts.onData("\n");
        const c = chunk.choices[0]?.delta?.content;
        if (c) opts.onData(c);
      }
    }
    return "";
  }

  const res = await openai.chat.completions.create({ model, messages });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");
  return content.trim();
}

function buildHistoryMessages(
  context: string,
  chat: ChatItem[],
): OpenAI.ChatCompletionMessageParam[] {
  const msgs: OpenAI.ChatCompletionMessageParam[] = [];
  if (SYSTEM) msgs.push({ role: "system", content: SYSTEM });
  if (context) msgs.push({ role: "user", content: context });
  chat.forEach(({ type, content }) => {
    msgs.push({
      role: type === "user" ? "user" : "assistant",
      content,
    });
  });
  return msgs;
}

export const streamOpenAIResponse = async (
  context: string,
  chat: ChatItem[],
  cb: (chunk: string) => void,
) => {
  const messages = buildHistoryMessages(context, chat);
  try {
    await sendChat(messages, { stream: true, onData: cb });
  } catch (err) {
    console.error("streamOpenAIResponse error:", err);
  }
};

async function genFromDiff(
  diff: string,
  systemPrompt: string,
): Promise<string> {
  if (!diff.trim()) throw new Error("Empty diff provided");

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Here is the diff:\n\n${diff}` },
  ];

  try {
    return await sendChat(messages);
  } catch (err) {
    console.error("genFromDiff error:", err);
    throw err;
  }
}

export const generateCommitMessage = (diff: string) =>
  genFromDiff(
    diff,
    "You are an expert Git commit message generator. Given a unified diff, produce a single, concise, well‑formatted commit message summarizing the changes.",
  );

export const generatePRDescription = (diff: string) =>
  genFromDiff(
    diff,
    "You are an expert Git PR description generator. Given a unified diff, produce a concise, well‑formatted PR description summarizing the changes in markdown format.",
  );

export const generatePRReview = (diff: string) =>
  genFromDiff(
    diff,
    "You are an expert senior engineer. Given a unified diff to base branch (master or main), produce a concise, well‑formatted review of all the changes. Focus on code that can result in bugs and untested cases. Review the architecture and structure of the code. Look for potential logic and performance improvements. Provide compact summary in markdown format",
  );
