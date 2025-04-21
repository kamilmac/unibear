import { StoreApi } from "npm:zustand/vanilla";
import {
  generateCommitMessage,
  generatePRDescription,
} from "../services/openai.ts";
import {
  getGitDiffToBaseBranch,
  getGitDiffToLatestCommit,
} from "../utils/git.ts";
import { commitAllChanges } from "../utils/git.ts";
import type { Command, Store } from "./index.ts";
import { HELP_TEXT } from "../utils/constants.ts";

type GetState<T> = StoreApi<T>["getState"];
type SetState<T> = StoreApi<T>["setState"];

// Factory that builds your commands object
export function buildCommands(
  set: SetState<Store>,
  get: GetState<Store>,
): Record<string, Command> {
  return {
    clear: {
      process: () => {
        get().clearChatHistory();
      },
    },
    help: {
      process: () => {
        get().appendChatItem("", HELP_TEXT, "command");
      },
    },
    commit: {
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
    pr: {
      process: async () => {
        set({ isCommandInFlight: true });
        const diff = await getGitDiffToBaseBranch();
        if (!diff) {
          get().appendChatItem("", "No changes to base branch", "command");
          return set({ isCommandInFlight: false });
        }
        const desc = await generatePRDescription(diff);
        set({ isCommandInFlight: false });
        get().appendChatItem("", `PR description: ${desc}`, "command");
      },
    },
    "inject-file": {
      process: async (arg?: string) => {
        if (!arg) return;
        const absolute = arg.startsWith("/") ? arg : `${Deno.cwd()}/${arg}`;
        get().addFileToContext(absolute);
      },
    },
  };
}
