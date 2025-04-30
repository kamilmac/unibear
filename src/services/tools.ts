import { OpenAI } from "npm:openai";
import { gitTools } from "./tools/git.ts";
import { fsTools } from "./tools/fs.ts";
import { commonTools } from "./tools/common.ts";

export const getTools = (
  mode: ToolMode = "normal",
): Array<OpenAI.ChatCompletionTool> => {
  const allTools = [
    ...commonTools,
    ...gitTools,
    ...fsTools,
  ];
  const filtered = allTools
    .filter((t) => t.mode.includes(mode));
  const processes = {};
  const definitions = [];
  filtered.forEach((t) => {
    processes[t.definition.function.name] = t.process;
    definitions.push(t.definition);
  });
  return {
    processes,
    definitions,
  };
};
