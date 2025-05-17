import { OpenAI } from "npm:openai";
import { TEMPERATURE } from "../../utils/constants.ts";
import { PreparedTools } from "../tools.ts";
import { config } from "../../utils/config.ts";

const openai_config = {
  baseURL: Deno.env.get("OPENAI_API_URL") ?? "",
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? undefined,
  model: config.model ?? "o4-mini",
  webSearchModel: config.web_search_model ?? "gpt-4.1-mini",
};

const anthropic_config = {
  baseURL: "https://api.anthropic.com/v1/",
  apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? undefined,
  model: config.model ?? "claude-3-7-sonnet-20250219",
  webSearchModel: config.web_search_model ?? "claude-3-7-sonnet-20250219",
};

const gemini_config = {
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: Deno.env.get("GEMINI_API_KEY") ?? undefined,
  model: config.model ?? "gemini-2.5-flash-preview-04-17",
  webSearchModel: config.web_search_model ?? "gemini-2.5-flash-preview-04-17",
};

const ollama_config = {
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  model: "ollama",
  webSearchModel: "ollama",
};

export const OLLAMA_BASE_URL = "http://localhost:11434/v1";
let llmCfg = openai_config;
if (config.provider === "anthropic") {
  llmCfg = anthropic_config;
} else if (config.provider === "gemini") {
  llmCfg = gemini_config;
} else if (config.provider === "ollama") {
  llmCfg = ollama_config;
}

export interface LLMAdapter {
  init: () => void;
  stream: (
    messages: OpenAI.ChatCompletionMessageParam[],
    tools: PreparedTools,
  ) => Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>>;
  send: (system: string, content: string) => Promise<string>;
  webSearch: (searchString: string) => Promise<string>;
}

let llm: OpenAI;

const init: LLMAdapter["init"] = () => {
  llm = new OpenAI({
    baseURL: llmCfg.baseURL,
    apiKey: llmCfg.apiKey,
  });
  return llm;
};

const stream: LLMAdapter["stream"] = async (messages, tools) => {
  return await llm.chat.completions.create({
    model: llmCfg.model,
    messages,
    stream: true,
    temperature: TEMPERATURE,
    tools: tools.definitions,
  });
};

const webSearch: LLMAdapter["webSearch"] = async (searchString) => {
  const response = await llm.responses.create({
    model: llmCfg.webSearchModel,
    tools: [{
      type: "web_search_preview",
      search_context_size: "medium",
    }],
    input: searchString as string,
  });
  return response.output_text;
};

const send: LLMAdapter["send"] = async (system, content) => {
  const { choices } = await llm.chat.completions.create({
    model: llmCfg.model,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content,
      },
    ],
  });
  const message = choices[0].message?.content?.trim() || "";
  return message;
};

export const LLM: LLMAdapter = {
  init,
  stream,
  webSearch,
  send,
};
