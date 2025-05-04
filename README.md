# Logan CLI Chat – README Summary

Logan is a terminal-based, Vim-inspired chat interface powered by React Ink and Deno.
It streams responses from OpenAI, lets you inject file context or clipboard content,
and offers Insert/Normal modes with intuitive keybindings.

## 🚀 Key Features

    * Interactive Modes
        * Insert mode for typing prompts

        * Normal (visual) mode for navigation, selection & clipboard ops
    * Streaming AI Responses
        * Tokens render as they arrive

        * Markdown support via marked + marked-terminal
    * File-Context Injection
        * Add/remove files to prompt context

        * Auto-validate and drop missing files
    * Clipboard Integration
        * Paste into chat (p in normal mode)

        * Yank selections to system clipboard (y)
    * Vim-like Navigation
        * Scrolling: j/k, J/K, gg, G, ge

        * Delete chat items with d
    * Responsive Layout
        * Auto-resize on terminal resize

        * Text area height & status line

## 🏗 Architecture & Core Components

    * App.tsx
      Root component: initializes store, handles Ctrl+Q quit, toggles modes.
    * store/main.ts
      Zustand store: dimensions, chat history, file context, streaming logic.
    * Chat.tsx
      Renders chat buffer inside a bordered box, handles scrolling, selection.
    * UserInput.tsx
      Input box in Insert mode, cursor management, key mappings for tool modes.
    * StatusLine.tsx
      Displays current mode, workspace name, file-count indicator.
    * utils/constants.ts
      Shared values: colors, key maps, text area height, banner, labels.
    * utils/helpers.ts
      Helpers for quitting, file existence, ANSI controls.

## 🎮 Usage & Controls

    1. Launch: deno run -A src/cli.ts
    2. Insert mode (prompt): press i in normal mode or start typing
    3. Submit: Enter ↵
    4. Normal mode: Esc or Ctrl+Q to quit
    5. Navigation:
        * Scroll: j/k (one), J/K (four)

        * Top/Bottom: gg/G or ge
    6. Selection & Clipboard:
        * Enter Visual: v, yank: y

        * Paste: p
    7. File Context: :add <path>, :rm <path> (via prompt)

## 🛠 Technologies

    * Deno
    * React Ink
    * Zustand
    * OpenAI streaming API
    * marked + marked-terminal
    * clippy (clipboard)

---

Logan blends a lightweight REPL-style UI with Vim-style ergonomics,
perfect for CLI-centric workflows that need AI-powered assistance.
