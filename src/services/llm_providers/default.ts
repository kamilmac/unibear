import { OpenAI } from "npm:openai";
import { PROVIDER, TEMPERATURE } from "../../utils/constants.ts";
import { PreparedTools } from "../tools.ts";
import { config } from "../../utils/config.ts";
import { Logger } from "../logging.ts"; // Added

const openai_config = {
  baseURL: Deno.env.get("OPENAI_API_URL") ?? "",
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
  model: config.model ?? "o4-mini",
  reasoning_effort: config.reasoning_effort ?? "medium",
  webSearchModel: config.web_search_model ?? "gpt-4.1-mini",
};

const anthropic_config = {
  baseURL: "https://api.anthropic.com/v1/",
  apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  model: config.model ?? "claude-3-7-sonnet-20250219",
  reasoning_effort: config.reasoning_effort ?? "medium",
  webSearchModel: config.web_search_model ?? "claude-3-7-sonnet-20250219",
};

const gemini_config = {
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: Deno.env.get("GEMINI_API_KEY") ?? "",
  model: config.model ?? "gemini-2.5-flash-preview-04-17",
  reasoning_effort: config.reasoning_effort ?? "medium",
  webSearchModel: config.web_search_model ?? "gemini-2.5-flash-preview-04-17",
};

const ollama_config = {
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  model: config.model ?? "qwen3:30b-a3b",
  reasoning_effort: config.reasoning_effort ?? "medium",
  webSearchModel: config.model ?? "qwen3:30b-a3b",
};

let llmCfg = openai_config;
if (PROVIDER === "anthropic") {
  llmCfg = anthropic_config;
} else if (PROVIDER === "gemini") {
  llmCfg = gemini_config;
} else if (PROVIDER === "ollama") {
  llmCfg = ollama_config;
}

Logger.info(`LLM Provider configured: ${PROVIDER}`, { config: llmCfg }); // Added

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
  Logger.info("Initializing LLM Adapter", {
    provider: PROVIDER,
    baseURL: llmCfg.baseURL,
    model: llmCfg.model,
  }); // Added
  try {
    llm = new OpenAI({
      baseURL: llmCfg.baseURL,
      apiKey: llmCfg.apiKey,
    });
    Logger.info("LLM Adapter initialized successfully."); // Added
  } catch (error: any) {
    Logger.error("Failed to initialize LLM Adapter", {
      provider: PROVIDER,
      error: error.message,
      stack: error.stack,
    }); // Added
    throw error; // Re-throw after logging
  }
  return llm;
};

const stream: LLMAdapter["stream"] = async (messages, tools) => {
  Logger.debug("Starting LLM stream", {
    model: llmCfg.model,
    messageCount: messages.length,
    toolCount: tools.definitions.length,
  }); // Added
  try {
    const streamResult = await llm.chat.completions.create({
      model: llmCfg.model,
      messages,
      reasoning_effort: llmCfg.reasoning_effort as OpenAI.ReasoningEffort,
      stream: true,
      temperature: TEMPERATURE,
      tools: tools.definitions,
    });
    Logger.debug("LLM stream creation successful"); // Added
    return streamResult;
  } catch (error) {
    Logger.error("LLM stream creation failed", {
      model: llmCfg.model,
      error: error.message,
      stack: error.stack,
    }); // Added
    throw error; // Re-throw after logging
  }
};

const webSearch: LLMAdapter["webSearch"] = async (searchString) => {
  Logger.info("Performing LLM web search", {
    model: llmCfg.webSearchModel,
    searchString,
  }); // Added
  try {
    const response = await llm.responses.create({
      model: llmCfg.webSearchModel,
      tools: [{
        type: "web_search_preview",
        search_context_size: "medium",
      }],
      input: searchString as string,
    });
    Logger.info("LLM web search successful", {
      output_length: response.output_text?.length,
    }); // Added
    return response.output_text;
  } catch (error) {
    Logger.error("LLM web search failed", {
      model: llmCfg.webSearchModel,
      searchString,
      error: error.message,
      stack: error.stack,
    }); // Added
    throw error; // Re-throw after logging
  }
};

const send: LLMAdapter["send"] = async (system, content) => {
  Logger.info("Sending single message to LLM", { model: llmCfg.model }); // Added
  Logger.debug("LLM send details", { system, content_length: content.length }); // Added
  try {
    const { choices } = await llm.chat.completions.create({
      reasoning_effort: llmCfg.reasoning_effort as OpenAI.ReasoningEffort,
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
    Logger.info("LLM send successful", { response_length: message.length }); // Added
    return message;
  } catch (error) {
    Logger.error("LLM send failed", {
      model: llmCfg.model,
      error: error.message,
      stack: error.stack,
    }); // Added
    throw error; // Re-throw after logging
  }
};

export const LLM: LLMAdapter = {
  init,
  stream,
  webSearch,
  send,
};
