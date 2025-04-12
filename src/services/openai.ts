import { OpenAI } from "npm:openai";
import { ChatItem } from "../store/index.ts";
import { SYSTEM } from "../utils/constants.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

export const streamOpenAIResponse = async (
  context: string,
  chat: ChatItem[],
  cb: (content: string) => void,
) => {
  const payload: OpenAI.ChatCompletionMessageParam[] = [];
  if (SYSTEM) {
    payload.push({ role: "system", content: SYSTEM });
  }
  if (context) {
    payload.push({ role: "user", content: context });
  }
  for (let i = 0; i < chat.length; i += 1) {
    if (chat[i].type === "user") {
      payload.push({ role: "user", content: chat[i].content });
    } else if (chat[i].type === "ai") {
      payload.push({ role: "assistant", content: chat[i].content });
    }
  }
  try {
    const stream = await openai.chat.completions.create({
      model: "o3-mini",
      messages: payload,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      cb(content);
    }
  } catch (error) {
    console.error({ error });
  }
};
