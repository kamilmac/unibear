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
import { COLORS } from "../utils/constants.ts";

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
      },
    },
    help: {
      desc: "HELP!",
      process: () => {
        // build a nice summary
        const lines = Object.entries(commands).map(
          ([name, cmd]) =>
            `- :${COLORS.command(name.padEnd(12))} – ${cmd.desc}`,
        );
        lines.unshift("## Available commands: ");
        const helpText = lines.join("\n");
        get().appendChatItem("", helpText, "command");
      },
    },
    "git-commit": {
      desc: "Commits all changes with relevant message",
      process: async () => {
        set({ isCommandInFlight: true });
        const diff = await getGitDiffToLatestCommit();
        if (!diff) {
          get().appendChatItem("", "No changes to commit", "command");
          return set({ isCommandInFlight: false });
        }
        const msg = await generateCommitMessage(diff);
        commitAllChanges(msg);
        set({ isCommandInFlight: false });
        get().appendChatItem("", `Committed all changes: ${msg}`, "command");
      },
    },
    "git-pr": {
      desc: "Creates description for GH PR (diff to base branch)",
      process: async () => {
        set({ isCommandInFlight: true });
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          get().appendChatItem("", "No changes to base branch", "command");
          return set({ isCommandInFlight: false });
        }
        const desc = await generatePRDescription(diff);
        set({ isCommandInFlight: false });
        get().appendChatItem(desc, `PR description: ${desc}`, "command");
      },
    },
    "git-review": {
      desc: "Reviews your changes (diff to base branch)",
      process: async () => {
        set({ isCommandInFlight: true });
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          get().appendChatItem("", "No changes to base branch", "command");
          return set({ isCommandInFlight: false });
        }
        if (!diff) {
          get().appendChatItem(
            "",
            "Requested review of all changes to base branch...",
            "command",
          );
          return set({ isCommandInFlight: false });
        }
        const review = await generatePRReview(diff);
        set({ isCommandInFlight: false });
        get().appendChatItem(review, `PR review: ${review}`, "command");
      },
    },
    "inject-file": {
      desc: "Injects file in the context.",
      process: (arg?: string) => {
        if (!arg) return;
        const absolute = arg.startsWith("/") ? arg : `${Deno.cwd()}/${arg}`;
        get().addFileToContext(absolute);
      },
    },
  };
  return commands;
}
