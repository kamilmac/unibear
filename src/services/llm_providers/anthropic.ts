import { OpenAI } from "npm:openai";
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_API_URL,
  ANTHROPIC_MODEL,
  TEMPERATURE,
} from "../../utils/constants.ts";

let llm: OpenAI;

const init = (): OpenAI => {
  llm = new OpenAI({
    baseURL: ANTHROPIC_API_URL,
    apiKey: ANTHROPIC_API_KEY,
  });
  return llm;
};

const stream = async (messages, tools, state, opts) => {
  let _stream = await llm.chat.completions.create({
    model: ANTHROPIC_MODEL,
    messages,
    stream: true,
    temperature: TEMPERATURE,
    tools: tools.definitions.map((d) => ({
      ...d,
      function: {
        ...d.function,
        parameters: {
          ...d.function.parameters,
          type: "object",
        },
      },
    })),
  });
  for await (const chunk of _stream) {
    const delta = chunk.choices?.[0].delta;
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
      opts.onChunk(content);
    }
    if (chunk.choices?.[0].finish_reason === "stop") {
      state.stop = true;
    }
  }
};

export const AnthropicAdapter = {
  init,
  stream,
};
