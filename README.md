# Unibear

A terminal-based AI assistant powered by Deno, Ink and OpenAI (wider llm support on the way).
Interact in prompt or visual (Vim|Helix-like) modes, inject file context, run git and fs tools, or
even web search.

![Unibear image](assets/unibear_shot.png)

The idea behind Unibear is to simplify the user interaction with LLM and minimise the amount of magic
occuring behind the scenes. Actively brainstorm with your buddy Unibear, work on solution and only when you're ready,
enable 'edit' tool to apply changes to your files and commit to GH using 'git' tool.
As of now only one tool can be enabled and mroe tools are on the roadmap.

App to some degree reflects TUI editors like Neovim and Helix.
You can work in two modes -> Prompt & Visual.
Prompt ('i' key) is where you write your prompts and enable tools.
Visual ('esc' kye) is where you operate on the chat content.

### Prompt Mode

    * Press i (in visual)
    * Type your prompt, Enter to send
    * Add tools like 'edit', 'git', 'web search'

### Visual Mode

    * Press esc (in prompt)
    * Navigate output with j/k (down/up)
    * Big scroll J/K
    * Select (v), yank (y), paste (p)
    * Delete chat item (d), go top (gg), go end (G, ge)

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/kamilmac/unibear/main/install.sh | sh
```

Make sure `OPENAI_API_KEY` is in your environment.

## Helix and Vim integration

You can run only one instance of Unibear as of now.
Afterwards you can use it as cli too pass context (Unibear is running a server for context communication)

```bash
unibear add_file <file_path>
```

You can setup Helix to pass buffer to Unibear context like this:

```yaml
[keys.normal]
C-a = [
  ":sh unibear add_file %{buffer_name}"
]
```

## Configuration (Example)

Config file (~/.config/unibear/config.json):

    {
      "model": "o4-mini",  // default
      "system": "Custom system prompt",
      "port": 12496,
      "theme": "dark",
      "user_name": "Alice",  // User name visible in chat window
      "key_bindings": {
        "useGitTools": ":",
        "useEditTools": "+",
        "useWebTools": "?"
      }
    }

### Tools

    * Defaut mode:
        * read_multiple_files
        * search_files
        * app_control_reset_chat
        * app_control_quit
        * help
    * Git tools (:):
        * git_auto_commit
        * git_review
        * git_create_pr_description
    * Edit tools (+):
        * edit_file
    * Web tools (?):
        * web_search

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

## License

MIT
