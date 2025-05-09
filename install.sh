#!/usr/bin/env bash
set -euo pipefail

owner=kamilmac
repo=unibear
version=${1:-latest}

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

echo "→ installing to /usr/local/bin/unibear${ext}"
sudo mv /tmp/unibear${ext} /usr/local/bin/unibear${ext}

echo "✔ unibear ${version} installed"
