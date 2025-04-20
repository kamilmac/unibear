import { OpenAI } from "npm:openai";
import { ChatItem } from "../store/index.ts";
import { SYSTEM } from "../utils/constants.ts";

const MODEL = "o4-mini";

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
      model: MODEL,
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

export const generateCommitMessage = async (
  diff: string,
): Promise<string> => {
  if (!diff.trim()) {
    throw new Error("Empty diff provided");
  }

  // Build messages
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are an expert Git commit message generator. " +
        "Given a unified diff, produce a single, concise, well-formatted commit message summarizing the changes.",
    },
    {
      role: "user",
      content: `Here is the diff:\n\n${diff}`,
    },
  ];

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages,
    });

    const msg = res.choices[0]?.message?.content;
    if (!msg) {
      throw new Error("No content returned from OpenAI");
    }
    return msg.trim();
  } catch (err) {
    console.error("generateCommitMessage error:", err);
    throw err;
  }
};

export const generatePRDescription = async (
  diff: string,
): Promise<string> => {
  if (!diff.trim()) {
    throw new Error("Empty diff provided");
  }

  // Build messages
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are an expert Git PR description generator. " +
        "Given a unified diff, produse a concise, well-formatted PR description summarizing the changes in markdown format.",
    },
    {
      role: "user",
      content: `Here is the diff:\n\n${diff}`,
    },
  ];

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages,
    });

    const msg = res.choices[0]?.message?.content;
    if (!msg) {
      throw new Error("No content returned from OpenAI");
    }
    return msg.trim();
  } catch (err) {
    console.error("generatePRDescription error:", err);
    throw err;
  }
};
