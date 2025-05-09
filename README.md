# Unibear

A terminal-based AI assistant powered by Deno, React Ink and OpenAI. Interact in
prompt or visual (Vim-like) modes, inject file context, run git and fs tools, or
even web search.

## Features

- AI chat with streaming replies
- Prompt & visual modes (based on Vim/Helix)
- File-context management (add/remove files to improve AI context)
- Built-in tools:
  - `fs`: read/search/edit files
  - `git`: diff, review, auto-commit, PR descriptions
  - `web_search`: live web preview
  - `app_control`: reset history, quit, help
- CLI helper: `unibear add_file <path>`
- Responsive TUI: status line, scrollable, selection & yank

## Requirements

- Deno ≥ 1.40
- `OPENAI_API_KEY` in your environment
- Optional: `DEV=true` for light theme

## Installation

```bash
git clone https://github.com/your/repo.git
cd repo
deno task dev
```

## Configuration

Config file (~/.config/unibear/config.json):

    {
      "model": "o4-mini",
      "system": "Custom system prompt",
      "port": 12496,
      "theme": "dark",
      "user_name": "Alice",
      "key_bindings": {
        "useGitTools": ":",
        "useEditTools": "+",
        "useWebTools": "?"
      }
    }

## Usage

### Start

    deno run --allow-all src/main.ts

### Prompt Mode

    * Press i (in visual)
    * Type your prompt, Enter to send

### Visual Mode

    * Navigate output with j/k (down/up)
    * Big scroll J/K
    * Select (v), yank (y), paste (p)
    * Delete line (d), go top (gg), go end (G)
    * Switch back to prompt: i

### Tools

    * Git tools (:):
        * git_auto_commit

        * git_review

        * git_create_pr_description
    * Edit tools (+): read_multiple_files, search_files, edit_file
    * Web tools (?): web_search
    * App control:
        * app_control_reset_chat

        * app_control_quit

        * help

## Key Bindings

    {
      "moveDown": ["j"],
      "moveUp": ["k"],
      "bigMoveDown": ["J"],
      "bigMoveUp": ["K"],
      "yank": ["y"],
      "select": ["v"],
      "promptMode": ["i"],
      "goToEnd": ["ge","G"],
      "goToTop": ["gg"],
      "paste": ["p"],
      "del": ["d"],
      "useGitTools": [":"],
      "useEditTools": ["+"],
      "useWebTools": ["?"]
    }

## Architecture

    src/
    ├─ api/
    │  └─ server.ts           # REST endpoint for CLI commands
    ├─ components/            # Ink UI components
    ├─ services/
    │  ├─ openai.ts           # OpenAI streaming & tools dispatcher
    │  └─ tools/              # fs, git & common tool implementations
    ├─ store/
    │  └─ main.ts             # Zustand state & chat pipeline
    ├─ utils/
    │  ├─ constants.ts        # colors, labels, key maps
    │  ├─ helpers.ts          # CLI args, fileExists, quit
    │  ├─ config.ts           # config loader
    │  └─ git.ts              # raw git commands
    └─ main.ts                # entrypoint & Ink render

## License

MIT
