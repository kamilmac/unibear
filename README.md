# Unibear

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/kamilmac/unibear)](https://github.com/kamilmac/unibear/releases)

<center>
  <img src="https://github.com/kamilmac/unibear/blob/main/assets/unibear-face-small.png" alt="Unibear" />
</center>

A lean TUI AI assistant: run your tools, stay in charge, zero magic tricks.

![Unibear Screenshot](assets/unibear-shot.png)

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Editor Integrations](#editor-integrations)
- [Configuration](#configuration)
- [Modes](#modes)
  - [Prompt Mode](#prompt-mode)
  - [Visual Mode](#visual-mode)
- [Tools](#tools)
- [Key Bindings](#key-bindings)
- [Development](#development)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [FAQ](#faq)

<br>

## Installation

```bash
curl -fsSL \
  https://raw.githubusercontent.com/kamilmac/unibear/main/install.sh \
  | bash
```

> Ensure `OPENAI_API_KEY` is set in your environment.

Launch Unibear:

```bash
unibear
```

<br>

## Features

- 🚀 Work in **Prompt** or **Visual** (Vim/Helix-like) modes
- 🔍 Inject arbitrary file context
- 🔧 Built-in Git, filesystem and web-search tools
- 🤝 Plan & pair-program with your AI buddy before applying edits
- 🖥️ Responsive TUI

<br>

## Editor Integrations

> Only one Unibear instance at a time (it runs a local server).

### Helix / Vim

Add a buffer to Unibear’s context:

```bash
unibear add_file <path/to/file>
```

Example Helix mapping:

```toml
# ~/.config/helix/config.toml
[keys.normal]
C-a = [":sh unibear add_file %{buffer_name}"]
```

<br>

## Configuration

Create `~/.config/unibear/config.json`:

```json
{
  "model": "o4-mini",
  "system": "Your custom system prompt",
  "port": 12496,
  "theme": "dark",
  "user_name": "Alice",
  "key_bindings": {
    "useGitTools": ":",
    "useEditTools": "+",
    "useWebTools": "?"
  }
}
```

<br>

## Modes

### Prompt Mode

- Press `i`
- Type your prompt and hit ↵
- Invoke tools like `edit`, `git`, or `web_search`

### Visual Mode

- Press `Esc`
- Navigate output with `j`/`k` (or `J`/`K` for big scroll)
- Select (`v`), yank (`y`), paste (`p`), delete (`d`)
- Jump to top (`gg`) or end (`G`/`ge`)

<br>

## Tools

| Tool Group | Key | Commands                                                                          |
| ---------- | --- | --------------------------------------------------------------------------------- |
| Default    | –   | read_multiple_files, search_files, app_control_reset_chat, app_control_quit, help |
| Git        | `:` | git_auto_commit, git_review, git_create_pr_description                            |
| Edit       | `+` | edit_file                                                                         |
| Web        | `?` | web_search                                                                        |

<br>

## Key Bindings

```json
{
  "promptMode": ["i"],
  "visual": {
    "moveUp": ["k"],
    "moveDown": ["j"],
    "bigMoveUp": ["K"],
    "bigMoveDown": ["J"],
    "select": ["v"],
    "yank": ["y"],
    "paste": ["p"],
    "delete": ["d"],
    "goToTop": ["gg"],
    "goToEnd": ["G", "ge"]
  },
  "tools": {
    "git": [":"],
    "edit": ["+"],
    "web": ["?"]
  }
}
```

<br>

## Development

Clone the repo and get going locally:

```bash
git clone https://github.com/kamilmac/unibear.git
cd unibear
```

Leverage the built-in Deno tasks:

```bash
# watch & run in dev mode
deno task dev

# compile a standalone binary
deno task compile

# faster compile skipping type checks
deno task compile-no-check
```

<br>

## Contributing

Contributions welcome! Please open issues or pull requests with clear
descriptions. Follow DWYL style guide and run `deno fmt` & `deno lint`.

## Roadmap

- Better Windows build support
- Enhanced LLM model options
- Support for images
- Tools as plugins architecture

## FAQ

**Q: Port already in use?**\
A: Run `lsof -i :<port>` and kill the process or change `port` in config.

**Q: Invalid API key?**\
A: Ensure `$OPENAI_API_KEY` is set correctly.

## License

MIT
