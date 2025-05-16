// import { OpenAI } from "npm:openai";
// import {
//   OPENAI_API_KEY,
//   OPENAI_API_URL,
//   OPENAI_MODEL,
//   OPENAI_WEB_SEARCH_MODEL,
//   TEMPERATURE,
// } from "../../utils/constants.ts";
// import { LLMAdapter } from "../llm.ts";

// let llm: OpenAI;

// const init: LLMAdapter["init"] = () => {
//   llm = new OpenAI({
//     baseURL: OPENAI_API_URL,
//     apiKey: OPENAI_API_KEY,
//   });
//   return llm;
// };

// const stream: LLMAdapter["stream"] = async (messages, tools) => {
//   return await llm.chat.completions.create({
//     model: OPENAI_MODEL,
//     messages,
//     stream: true,
//     temperature: TEMPERATURE,
//     tools: tools.definitions,
//   });
// };

// const webSearch: LLMAdapter["webSearch"] = async (searchString) => {
//   const response = await llm.responses.create({
//     model: OPENAI_WEB_SEARCH_MODEL,
//     tools: [{
//       type: "web_search_preview",
//       search_context_size: "medium",
//     }],
//     input: searchString as string,
//   });
//   return response.output_text;
// };

// const send: LLMAdapter["send"] = async (system, content) => {
//   const { choices } = await llm.chat.completions.create({
//     model: OPENAI_MODEL,
//     messages: [
//       {
//         role: "system",
//         content: system,
//       },
//       {
//         role: "user",
//         content,
//       },
//     ],
//   });
//   const message = choices[0].message?.content?.trim() || "";
//   return message;
// };

// export const OpenAIAdapter: LLMAdapter = {
//   init,
//   stream,
//   webSearch,
//   send,
// };
