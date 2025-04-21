import { StoreApi } from "npm:zustand/vanilla";
import {
  generateCommitMessage,
  generatePRDescription,
  generatePRReview,
} from "../services/openai.ts";
import {
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../utils/git.ts";
import { commitAllChanges } from "../utils/git.ts";
import { COLORS, COMMAND_PREFIX } from "../utils/constants.ts";

type GetState<T> = StoreApi<T>["getState"];
type SetState<T> = StoreApi<T>["setState"];

// Factory that builds your commands object
export function buildCommands(
  set: SetState<Store>,
  get: GetState<Store>,
): Record<string, Command> {
  const commands: Record<string, Command> = {
    reset: {
      desc: "Clears whole context and history",
      process: () => {
        get().clearChatHistory();
        get().appendChatItem("", "Context and chat history cleared!", "ai");
      },
    },
    help: {
      desc: "HELP!",
      process: () => {
        const lines = Object
          .entries(commands)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(
            ([name, cmd]) =>
              `- ${COMMAND_PREFIX}${
                COLORS.command(name.padEnd(12))
              } – ${cmd.desc}`,
          );
        lines.unshift("## Available commands: ");
        const helpText = lines.join("\n");
        get().appendChatItem("", helpText, "ai");
      },
    },
    "git-commit": {
      desc: "Commits all changes with relevant message",
      process: async () => {
        get().appendChatItem(
          "",
          "git-commit",
          "command",
        );
        set({ isStreamingResponse: true });
        const diff = await getGitDiffToLatestCommit();
        if (!diff) {
          get().appendChatItem("", "No changes to commit", "command");
          return set({ isStreamingResponse: false });
        }
        const msg = await generateCommitMessage(diff);
        commitAllChanges(msg);
        set({ isStreamingResponse: false });
        get().appendChatItem("", `Committed all changes: ${msg}`, "ai");
      },
    },
    "git-pr": {
      desc: "Creates description for GH PR (diff to base branch)",
      process: async () => {
        get().appendChatItem(
          "",
          "git-pr",
          "command",
        );
        set({ isStreamingResponse: true });
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          get().appendChatItem("", "No changes to base branch", "command");
          return set({ isStreamingResponse: false });
        }
        const desc = await generatePRDescription(diff);
        set({ isStreamingResponse: false });
        get().appendChatItem(desc, `PR description: ${desc}`, "ai");
      },
    },
    "git-review": {
      desc: "Reviews your changes (diff to base branch)",
      process: async () => {
        get().appendChatItem(
          "",
          "git-review",
          "command",
        );
        set({ isStreamingResponse: true });
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          get().appendChatItem("", "No changes to base branch", "command");
          return set({ isStreamingResponse: false });
        }
        const review = await generatePRReview(diff);
        set({ isStreamingResponse: false });
        get().appendChatItem(review, `PR review: ${review}`, "ai");
      },
    },
    "inject-file": {
      desc: "Injects file in the context",
      process: (arg?: string) => {
        if (!arg) return;
        get().appendChatItem(
          "",
          `inject-file ${arg}`,
          "command",
        );
        const absolute = arg.startsWith("/") ? arg : `${Deno.cwd()}/${arg}`;
        get().addFileToContext(absolute);
        get().appendChatItem("", `Added ${absolute} to context.`, "ai");
      },
    },
  };
  return commands;
}
