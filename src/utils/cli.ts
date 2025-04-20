import { generateCommitMessage } from "../services/openai.ts";
import { useStore } from "../store/index.ts";
import { HELP_TEXT, PORT } from "./constants.ts";
import { commitAllChanges, getGitDiffToLatestCommit } from "./git.ts";

// Function to check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    await fetch(`http://localhost:${port}`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

// Function to send text to the inject endpoint
async function injectText(text: string): Promise<void> {
  try {
    const response = await fetch(`http://localhost:${PORT}/inject/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("Text injected successfully:", data.message);
  } catch (error) {
    console.error("Failed to inject text:", error);
  }
}

// Function to send file path to the inject file endpoint
async function injectFile(filePath: string): Promise<void> {
  try {
    // Convert to absolute path if not already
    const absolutePath = filePath.startsWith("/")
      ? filePath
      : `${Deno.cwd()}/${filePath}`;

    const response = await fetch(`http://localhost:${PORT}/inject/file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath: absolutePath }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Server responded with ${response.status}: ${
          errorData.error || response.statusText
        }`,
      );
    }

    console.log(`File injected successfully: ${filePath}`);
  } catch (error) {
    console.error("Failed to inject file:", error);
  }
}

export async function handleCliArgs(args: string[]): Promise<boolean> {
  const injectIndex = args.findIndex((arg) => arg === "inject");
  const injectFileIndex = args.findIndex((arg) => arg === "inject-file");
  // Handle inject text command
  if (injectIndex >= 0 && injectIndex < args.length - 1) {
    const textToInject = args.slice(injectIndex + 1).join(" ");
    const serverRunning = await isPortInUse(PORT);

    if (serverRunning) {
      await injectText(textToInject);
      return true;
    }
  }

  // Handle inject file command
  if (injectFileIndex >= 0 && injectFileIndex < args.length - 1) {
    const filePath = args[injectFileIndex + 1];
    const serverRunning = await isPortInUse(PORT);

    if (serverRunning) {
      await injectFile(filePath);
      return true;
    }
  }

  return false;
}

type Command = {
  process: () => void;
};

export const commands: Record<string, Command> = {
  "toggle_git_diff": {
    process: () => {
      useStore.getState().toggleGitDiffToBaseBranchInContext();
      let msg = "Enabled Git Diff to Base branch injection";
      if (!useStore.getState().isGitBaseDiffInjectionEnabled) {
        msg = "Disabled Git Diff to Base branch injection";
      }
      useStore.getState().appendChatItem(
        "",
        msg,
        "command",
      );
    },
  },
  "clear": {
    process: () => {
      useStore.getState().clearChatHistory();
    },
  },
  "help": {
    process: () => {
      useStore.getState().appendChatItem(
        "",
        HELP_TEXT,
        "command",
      );
    },
  },
  "commit": {
    process: async () => {
      const diff = await getGitDiffToLatestCommit();
      const commitMsg = await generateCommitMessage(diff);
      commitAllChanges(commitMsg);
      useStore.getState().appendChatItem(
        "",
        `Commited all changes: ${commitMsg}`,
        "command",
      );
    },
  },
};
