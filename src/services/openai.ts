import { OpenAI } from "npm:openai";
import { SYSTEM } from "../utils/constants.ts";
import { greetUser, processGreeting, toolFuncs, tools } from "./tools.ts";

const MODEL = "o4-mini";
export const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface SendChatOpts {
  model?: string;
  stream?: boolean;
  onData: (chunk: string) => void;
}

type AssistantContent = {
  role: "assistant";
  content: string;
  tool_calls: Array<{ id: string; function: { arguments: string; name: string }; type: "function" }>;
};

type ToolContent = {
  role: "tool";
  tool_call_id: string;
  content: any;
};

type AppendedContent = Array<AssistantContent | ToolContent>;

const MAX_ITERATIONS = 16;

async function sendChat(
  messages: OpenAI.ChatCompletionMessageParam[],
  opts: SendChatOpts = { onData: () => {} },
): Promise<string> {
  const model = opts.model || MODEL;

  let history = messages;
  let appendedContent: AppendedContent = [];

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    opts.onData("iterating...");
    let stream = await openai.chat.completions.create({
      model,
      messages: appendedContent.length
        ? [history[history.length - 1], ...appendedContent]
        : history,
      stream: true,
      tools: tools,
    });
    const state = {
      id: "",
      fnName: "",
      fnArgs: "",
      content: "",
      stop: false,
    };
    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;
      if (delta?.tool_calls) {
        state.id = state.id || (delta?.tool_calls?.[0]?.id || "");
        state.fnName = state.fnName ||
          (delta?.tool_calls?.[0]?.function?.name || "");
        state.fnArgs = state.fnArgs +
          (delta?.tool_calls?.[0]?.function?.arguments || "");
        // opts.onData(JSON.stringify(state));
        // opts.onData("\n");
      }
      const content = delta?.content;
      if (content) {
        state.content += content;
        opts.onData(content);
      }
      if (chunk.choices[0].finish_reason === "stop") {
        state.stop = true;
      }
    }
    if (state.stop) {
      break;
    }
    if (state.id) {
      const args = JSON.parse(state.fnArgs);
      opts.onData(`calling ${state.fnName}`);
      const result = await toolFuncs[state.fnName](args);
      opts.onData(JSON.stringify(result));
      appendedContent = [
        ...appendedContent,
        {
          role: "assistant",
          content: state.content,
          tool_calls: [
            {
              id: state.id,
              function: { arguments: state.fnArgs, name: state.fnName },
              type: "function",
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: state.id,
          content: result,
        },
      ];
    }
  }

  return "";
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
  // tool?: string,
) => {
  const messages = buildHistoryMessages(context, chat);
  try {
    // if (!tool) {
    //   const resp = await processGreeting(messages);
    //   cb(JSON.stringify(resp));
    //   return;
    // }
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
