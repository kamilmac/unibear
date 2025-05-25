type ChatItemType = "user" | "ai" | "external";

type ChatItem = {
  id: number;
  content: string;
  visibleContent: string[];
  type: ChatItemType;
};

type OperationMode = "prompt" | "visual";

type ToolMode = "normal" | "modify";

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
  chat: ChatItem[];
  onSubmitUserPrompt: (prompt: string, toolMode: ToolMode) => void;
  appendChatItem: (
    content: string,
    visibleContent: string,
    type: ChatItemType,
  ) => ChatItem[];
  removeChatItem: (id: number) => void;
  isStreamingResponse: boolean;
  cancelStream: () => void;
  isCancellationRequested: boolean;
  injectClipboard: () => void;
};
