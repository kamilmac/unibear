import { OpenAI } from "npm:openai";
import { SYSTEM } from "../utils/constants.ts";

const MODEL = "o4-mini";
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface SendChatOpts {
  model?: string;
  stream?: boolean;
  onData?: (chunk: string) => void;
}

async function sendChat(
  messages: OpenAI.ChatCompletionMessageParam[],
  opts: SendChatOpts = {},
): Promise<string> {
  const model = opts.model || MODEL;

  if (opts.stream && opts.onData) {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) opts.onData(content);
    }
    return "";
  }

  const res = await openai.chat.completions.create({ model, messages });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");
  return content.trim();
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

async function genFromDiff(
  diff: string,
  systemPrompt: string,
): Promise<string> {
  if (!diff.trim()) throw new Error("Empty diff provided");

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Here is the diff:\n\n${diff}` },
  ];

  try {
    return await sendChat(messages);
  } catch (err) {
    console.error("genFromDiff error:", err);
    throw err;
  }
}

export const generateCommitMessage = (diff: string) =>
  genFromDiff(
    diff,
    "You are an expert Git commit message generator. Given a unified diff, produce a single, concise, well‑formatted commit message summarizing the changes.",
  );

export const generatePRDescription = (diff: string) =>
  genFromDiff(
    diff,
    "You are an expert Git PR description generator. Given a unified diff, produce a concise, well‑formatted PR description summarizing the changes in markdown format.",
  );
