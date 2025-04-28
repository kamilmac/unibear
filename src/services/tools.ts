import { openai } from "./openai.ts";

const MODEL = "o4-mini";

export const GreetingTool = {
  "type": "function",
  "name": "greet",
  "description": "Greet user given the user name",
  "parameters": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name of the user e.g. John",
      },
    },
    "required": [
      "name",
    ],
    "additionalProperties": false,
  },
};

const greetUser = (name: string) => {
  return `Hi ${name}. Nice to meet you!`;
};

export const processGreeting = async (input) => {
  const response = await openai.responses.create({
    model: MODEL,
    input,
    tools: [GreetingTool],
  });

  const toolCall = response.output[1];
  // return response.output;
  const args = JSON.parse(toolCall.arguments);
  const result = greetUser(args.name);
  return result;
};
