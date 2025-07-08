#!/usr/bin/env bash
set -euo pipefail

version=${1:-latest}

if [[ "$version" == "--help" || "$version" == "-h" ]]; then
  echo "Usage: $0 [version]"
  echo "  version   Specify version (default: latest)"
  exit 0
fi

owner=kamilmac
repo=unibear

if [[ $version != "latest" ]]; then
  tag="download/$version"
else
  tag="latest/download"
fi

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
ext=""

case "$os" in
  linux)
    case "$arch" in
      x86_64) arch="x86_64-unknown-linux-gnu" ;;
      aarch64|arm64) arch="aarch64-unknown-linux-gnu" ;;
      *) echo "✗ unsupported linux arch: $arch" >&2; exit 1 ;;
    esac
    ;;
  darwin)
    case "$arch" in
      x86_64) arch="x86_64-apple-darwin" ;;
      aarch64|arm64) arch="aarch64-apple-darwin" ;;
      *) echo "✗ unsupported mac arch: $arch" >&2; exit 1 ;;
    esac
    ;;
  mingw*|msys*|cygwin*)
    os="windows"
    case "$arch" in
      x86_64) arch="x86_64-pc-windows-msvc" ;;
      aarch64|arm64) arch="aarch64-pc-windows-msvc" ;;
      *) echo "✗ unsupported windows arch: $arch" >&2; exit 1 ;;
    esac
    ext=".exe"
    ;;
  *)
    echo "✗ unsupported os: $os" >&2; exit 1 ;;
esac

bin="unibear-${os}_${arch}${ext}"
url="https://github.com/$owner/$repo/releases/$tag/$bin"

echo "→ downloading $url"
curl -fsSL "$url" -o /tmp/unibear${ext}
chmod +x /tmp/unibear${ext}

echo "→ installation location [user/system]:"
echo "  user (u): ~/.local/bin (current user only)"
echo "  system (s): /usr/local/bin (all users, requires sudo)"
echo ""
printf "❯ enter choice [user]: "
read -r choice

if [[ -z "$choice" ]]; then
  choice="user"
fi

case "$choice" in
  user|u)
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
    echo "→ installing user-local to $INSTALL_DIR/unibear${ext}"
    mv /tmp/unibear${ext} "$INSTALL_DIR/unibear${ext}"
    
    # Check if ~/.local/bin is in PATH
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
      echo ""
      echo "⚠ $HOME/.local/bin is not in your PATH"
      echo "   Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):"
      echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
    ;;
  system|s)
    INSTALL_DIR="/usr/local/bin"
    echo "→ installing system-wide to $INSTALL_DIR/unibear${ext}"
    sudo mv /tmp/unibear${ext} "$INSTALL_DIR/unibear${ext}"
    ;;
  *)
    echo "✗ invalid choice '$choice'. please enter 'user' or 'system'."
    exit 1
    ;;
esac

echo "✔ unibear ${version} installed to $INSTALL_DIR"
