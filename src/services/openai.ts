import { OpenAI } from "npm:openai";
import { SYSTEM } from "../utils/constants.ts";
import { toolFuncs, tools } from "./tools.ts";

const MODEL = "o4-mini";
const MAX_HISTORY = 20; // trim history to last N messages
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
  tool_calls: Array<
    {
      id: string;
      function: { arguments: string; name: string };
      type: "function";
    }
  >;
};

type ToolContent = {
  role: "tool";
  tool_call_id: string;
  content: any;
};

type AppendedContent = Array<AssistantContent | ToolContent>;

const MAX_ITERATIONS = 16;

// trim helper preserves system and first user messages
type Msg = OpenAI.ChatCompletionMessageParam;
function trimHistory(history: Msg[]): Msg[] {
  const prefixCount =
    history[0]?.role === "system" && history[1]?.role === "user" ? 2 : 0;
  const prefix = history.slice(0, prefixCount);
  const rest = history.slice(prefixCount);
  if (rest.length <= MAX_HISTORY) return history;
  return [...prefix, ...rest.slice(rest.length - MAX_HISTORY)];
}

async function sendChat(
  messages: OpenAI.ChatCompletionMessageParam[],
  opts: SendChatOpts = { onData: () => {} },
) {
  const model = opts.model || MODEL;

  let history = messages;

  const withWrite = messages?.[messages.length - 1]?.content?.startsWith("+");

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const stream = await openai.chat.completions.create({
      model,
      messages: history,
      stream: true,
      tools: tools(withWrite),
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
      let result = "";
      try {
        result = await toolFuncs[state.fnName](args, opts.onData);
      } catch (err) {
        result = err.message;
      }
      history.push(
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
      );
      history.push(
        {
          role: "tool",
          tool_call_id: state.id,
          content: result,
        },
      );
      // prune history to avoid unbounded growth
      history = trimHistory(history);
    }
  }
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
