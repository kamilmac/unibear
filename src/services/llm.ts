import { OpenAI } from "npm:openai";
import { SYSTEM } from "../utils/constants.ts";
import { getTools } from "./tools.ts";
import { AnthropicAdapter } from "./llm_providers/anthropic.ts";
import { OpenAIAdapter } from "./llm_providers/openai.ts";
import { config } from "../utils/config.ts";

const MAX_HISTORY = 16; // trim history to last N messages
const MAX_ITERATIONS = 16;

export let LLM = OpenAIAdapter;

if (config.provider === "anthropic") {
  LLM = AnthropicAdapter;
}

LLM.init();

interface SendChatOpts {
  onChunk: (chunk: string) => void;
}

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
  opts: SendChatOpts = { onChunk: () => {} },
) {
  let history = messages;

  const tools = getTools(toolMode, LLM, opts.onChunk);

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const state = {
      id: "",
      fnName: "",
      fnArgs: "",
      content: "",
      stop: false,
    };
    try {
      await LLM.stream(history, tools, state, opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      opts.onChunk(errorMessage);
      return;
    }
    if (state.stop) {
      break;
    }
    if (state.id) {
      const args = JSON.parse(state.fnArgs);
      let result = "";
      try {
        result = await tools.processes[state.fnName](args, opts.onChunk);
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
    await sendChat(messages, toolMode, { onChunk: cb });
  } catch (err) {
    console.error("streamOpenAIResponse error:", err);
  }
};
