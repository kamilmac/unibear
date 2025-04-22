type ChatItemType = "user" | "ai" | "injector" | "command";

type ChatItem = {
  id: number;
  content: string;
  visibleContent: string[];
  type: ChatItemType;
};

type OperationMode = "insert" | "normal" | "command";

type CommandKey =
  | "reset"
  | "help"
  | "git-commit"
  | "git-pr"
  | "git-review"
  | "inject-file";

type Command = {
  desc: string;
  process: (arg?: string) => void;
};

type Store = {
  init: () => void;
  dimensions: {
    cols: number;
    rows: number;
  };
  clearChatHistory: () => void;
  filesInContext: string[];
  addFileToContext: (filePath: string) => void;
  operationMode: OperationMode;
  setOperationMode: (mode: OperationMode) => void;
  systemMessage: string;
  textArea: string;
  setTextArea: (text: string) => void;
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string) => void;
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
  commands: Record<string, Command>;
};
