import { OpenAI } from "npm:openai";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

export const streamOpenAIResponse = async (
  content: string,
  cb: (content: string) => void,
) => {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content }],
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
