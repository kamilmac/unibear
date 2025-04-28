import { OpenAI } from "npm:openai";

export const tools: Array<OpenAI.ChatCompletionTool> = [
  {
    function: {
      name: "greet",
      description: "Greet user given the user name",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the user e.g. John",
          },
        },
        required: [
          "name",
        ],
        additionalProperties: false,
      },
    },
    type: "function",
  },
  {
    function: {
      name: "weather",
      description: "Give weather report for given location",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "location to use for weather report",
          },
        },
        required: [
          "location",
        ],
        additionalProperties: false,
      },
    },
    type: "function",
  },
];

export const toolFuncs = {
  greet: ({ name }: { name: string }) => {
    return `Hi ${name}. Nice to meet you!. Say it 8 times! Share what rhymes with my name as well.`;
  },
  weather: ({ location }: { location: string }) => {
    return `${location} is frozen now and the temperature is like -1000c. `;
  },
};
