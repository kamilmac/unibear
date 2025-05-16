import { OpenAI } from "npm:openai";
import {
  GEMINI_API_KEY,
  GEMINI_API_URL,
  GEMINI_MODEL,
  GEMINI_WEB_SEARCH_MODEL,
  TEMPERATURE,
} from "../../utils/constants.ts";
import { LLMAdapter } from "../llm.ts";

let llm: OpenAI;

const init: LLMAdapter["init"] = () => {
  llm = new OpenAI({
    baseURL: GEMINI_API_URL,
    apiKey: GEMINI_API_KEY,
  });
  return llm;
};

const stream: LLMAdapter["stream"] = async (messages, tools) => {
  return await llm.chat.completions.create({
    model: GEMINI_MODEL,
    messages,
    stream: true,
    temperature: TEMPERATURE,
    tools: tools.definitions,
  });
};

const webSearch: LLMAdapter["webSearch"] = async (searchString) => {
  const response = await llm.completions.create({
    model: GEMINI_WEB_SEARCH_MODEL,
    prompt: searchString as string,
    temperature: TEMPERATURE,
  });
  return response.choices[0]?.text?.trim() || "";
};

const send: LLMAdapter["send"] = async (system, content) => {
  const { choices } = await llm.chat.completions.create({
    model: GEMINI_MODEL,
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

export const GeminiAdapter: LLMAdapter = {
  init,
  stream,
  webSearch,
  send,
};