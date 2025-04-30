import OpenAI from "npm:openai";

type ChatItemType = "user" | "ai";

type ChatItem = {
  id: number;
  content: string;
  visibleContent: string[];
  type: ChatItemType;
};

type OperationMode = "insert" | "normal";

type ToolMode = "normal" | "edit" | "git";

interface Tool {
  name: string;
  definition: OpenAI.ChatCompletionTool;
  mode: ToolMode[];
  process: (
    args: Record<string, any>,
    log?: (str: string) => void,
  ) => Promise<string>;
}

type Store = {
  init: () => void;
  dimensions: {
    cols: number;
    rows: number;
  };
  clearChatHistory: () => void;
  filesInContext: string[];
  addFileToContext: (filePath: string) => void;
  removeFileFromContext: (filePath: string) => void;
  operationMode: OperationMode;
  setOperationMode: (mode: OperationMode) => void;
  systemMessage: string;
  textArea: string;
  setTextArea: (text: string) => void;
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string, toolMode: ToolMode) => void;
  appendChatItem: (
    content: string,
    visibleContent: string,
    type: ChatItemType,
  ) => ChatItem[];
  workspaceName: string;
  isStreamingResponse: boolean;
  injectClipboard: () => void;
  tokensInput: number;
  tokensOutput: number;
  injectContext: (content: string, visibleContent: string) => void;
};
