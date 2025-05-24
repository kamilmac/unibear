# Unibear Purpose

Unibear is a lightweight terminal-based AI assistant designed for developers. It
connects to OpenAI, Anthropic, Gemini, or local LLMs (via Ollama) and provides
two modes of interaction:

- Prompt Mode: freeform prompts with tool invocations (edit, git, web search).
- Visual Mode: vim-like navigation for inspecting and selecting AI-generated
  content.

Key Features:

- Inject and inspect file context.
- Built-in Git, filesystem, and web-search tools.
- Plan and apply code edits with AI guidance.
- Editor integrations (Helix, Neovim).
- Customizable config and key bindings.

# Project Overview: Unibear

## 1. Entry Point

**src/main.ts**

- Bootstraps Ink-based React CLI UI and Oak HTTP server.
- Parses CLI args (`--version`, custom commands) via `handleCliArgs`.
- Starts REST API on port from `utils/constants.ts`.
- Renders `<App />` and handles SIGINT to cleanly exit.

## 2. Core Types

**src/types.d.ts**

- Defines ChatItem, ChatItemType (`user`|`ai`|`external`).
- OperationMode (`prompt`|`visual`) and ToolMode.
- Store interface: chat history, file context, dimensions, operations.

## 3. Utilities

**src/utils/helpers.ts**

- CLI arg handling, version flag, remote commands.
- Token counting, terminal quit, file existence check.

**src/utils/constants.ts**

- Colors, banners, key bindings, labels, port, version, theme.
- SYSTEM prompt text injection.

**src/utils/config.ts**

- Loads JSON config from `$XDG_CONFIG_HOME/unibear/config.json`.
- Exposes `config` object.

**src/utils/git.ts**

- Git diff helpers: diff to base branch or HEAD.
- Commit all changes with generated message.

## 4. Components (Ink + React)

- **App.tsx**: Layout (Chat window, input, status line), input-mode switching.
- **Chat.tsx**: Renders banner + chat history, scrolling, visual selection.
- **UserInput.tsx**: Handles keystrokes, cursor, tool-mode prefix, submit.
- **StatusLine.tsx**: Shows current mode, workspace name, files in context.
- **Thinking.tsx**: Spinner animations.

## 5. API Server

**src/api/server.ts**

- Oak-based router on `/command/add_file` to inject external files into context.

## 6. LLM & Tools

**src/services/llm_providers/default.ts**

- Adapters for OpenAI, Anthropic, Gemini, Ollama.
- `stream`, `send`, `webSearch` methods, config-driven.

**src/services/llm.ts**

- Orchestrates chat streaming, tool calls loop, tool dispatch.
- Trims history, enforces max tool iterations.

**src/services/tools/**

- **fs.ts**: `read_multiple_files`, `search_files`, `write_file`, `edit_file`,
  `create_directory`, `list_directory` implementations with validation.
- **common.ts**: `web_search`, `help` tool, combines FS & Git tools.
- **git.ts**: `git_commit`, `git_review`, `git_create_pr_description` using LLM
  reviews and commits.
- **tools.ts**: Filters tools by `ToolMode` and prepares definitions +
  processes.

## 7. State Management

**src/store/main.ts**

- Uses Zustand to manage chat, mode, dimensions, context files.
- `onSubmitUserPrompt` builds system/user history, streams LLM response, updates
  chat.
- Clipboard injection, clear chat, file context operations.

---

_Summary generated automatically._

USER SECTION:
TODO:
[ ] Root file for context about repo
[ ] Cleanup git tools
[ ] create 'write' state instead of many tools
