import { OpenAI } from "npm:openai";
import { gitTools } from "./tools/git.ts";
import { fsTools } from "./tools/fs.ts";
import { commonTools } from "./tools/common.ts";

export interface Tool {
  definition: OpenAI.ChatCompletionTool;
  mode: ToolMode[];
  process: (
    args: Record<string, unknown>,
    log: (str: string) => void,
  ) => Promise<string>;
}

export const getTools = (
  mode: ToolMode = "normal",
  llm: any,
  log: any,
): {
  definitions: Array<OpenAI.ChatCompletionTool>;
  processes: Record<Tool["definition"]["function"]["name"], Tool["process"]>;
} => {
  const allTools = [
    ...commonTools(llm),
    ...gitTools(llm),
    ...fsTools(llm),
  ];
  log(allTools.length);
  const filtered = allTools
    .filter((t) => t.mode.includes(mode));
  const processes: Record<
    Tool["definition"]["function"]["name"],
    Tool["process"]
  > = {};
  const definitions: Array<OpenAI.ChatCompletionTool> = [];
  filtered.forEach((t) => {
    processes[t.definition.function.name] = t.process;
    definitions.push(t.definition);
  });
  return {
    processes,
    definitions,
  };
};
