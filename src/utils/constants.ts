export const PORT = 12492;
export const COMMAND_PREFIX = "/";
export const IS_DEV = Deno.env.get("development");

export const DEV_CHAT_PLACEHOLDER = `
# Deno

[![](https://img.shields.io/crates/v/deno.svg)](https://crates.io/crates/deno)
[![Twitter badge][]][Twitter link] [![Bluesky badge][]][Bluesky link]
[![Discord badge][]][Discord link] [![YouTube badge][]][YouTube link]

<img align="right" src="https://deno.land/logo.svg" height="150px" alt="the deno mascot dinosaur standing in the rain">

[Deno](https://deno.com)
([/ˈdiːnoʊ/](https://ipa-reader.com/?text=%CB%88di%CB%90no%CA%8A), pronounced
dee-no) is a JavaScript, TypeScript, and WebAssembly runtime with secure
defaults and a great developer experience. It's built on [V8](https://v8.dev/),
[Rust](https://www.rust-lang.org/), and [Tokio](https://tokio.rs/).

Learn more about the Deno runtime
[in the documentation](https://docs.deno.com/runtime/manual).

## Installation

Install the Deno runtime on your system using one of the commands below. Note
that there are a number of ways to install Deno - a comprehensive list of
installation options can be found
[here](https://docs.deno.com/runtime/manual/getting_started/installation).

Shell (Mac, Linux):

\`\`\`sh
curl -fsSL https://deno.land/install.sh | sh
\`\`\`

PowerShell (Windows):

\`\`\`powershell
irm https://deno.land/install.ps1 | iex
\`\`\`

[Homebrew](https://formulae.brew.sh/formula/deno) (Mac):

\`\`\`sh
brew install deno
\`\`\`

### Build and install from source

Complete instructions for building Deno from source can be found in the manual
[here](https://docs.deno.com/runtime/manual/references/contributing/building_from_source).

## Your first Deno program

Deno can be used for many different applications, but is most commonly used to
build web servers.
`;
