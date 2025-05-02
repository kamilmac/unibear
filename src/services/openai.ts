import { OpenAI } from "npm:openai";
import { APP_CONTROL_PREFIX, MODEL, SYSTEM } from "../utils/constants.ts";
import { getTools } from "./tools.ts";

const MAX_HISTORY = 16; // trim history to last N messages
export const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface SendChatOpts {
  model?: string;
  stream?: boolean;
  onData: (chunk: string) => void;
}

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
  toolMode: ToolMode,
  opts: SendChatOpts = { onData: () => {} },
) {
  const model = opts.model || MODEL;

  let history = messages;

  const tools = getTools(toolMode);

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    let stream;
    try {
      stream = await openai.chat.completions.create({
        model,
        messages: history,
        stream: true,
        tools: tools.definitions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      opts.onData(errorMessage);
      return;
    }
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
        result = await tools.processes[state.fnName](args, opts.onData);
        if (state.fnName.startsWith(APP_CONTROL_PREFIX)) {
          return;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result = `Communicate problem in tool processing: ${errorMessage}`;
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
  chat.forEach(({ type, content }) => {
    msgs.push({
      role: type === "user" ? "user" : "assistant",
      content,
    });
  });
  msgs[msgs.length - 1].content += context;
  return msgs;
}

export const streamOpenAIResponse = async (
  context: string,
  chat: ChatItem[],
  toolMode: ToolMode,
  cb: (chunk: string) => void,
) => {
  const messages = buildHistoryMessages(context, chat);
  try {
    await sendChat(messages, toolMode, { stream: true, onData: cb });
  } catch (err) {
    console.error("streamOpenAIResponse error:", err);
  }
};
