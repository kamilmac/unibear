#!/usr/bin/env bash
set -euo pipefail

owner=kmacinski
repo=unibear
version=${1:-latest}

if [[ $version != "latest" ]]; then
  tag="download/$version"
else
  tag="latest"
fi

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case $arch in
  x86_64) arch="x86_64-unknown-linux-gnu" ;;
  aarch64|arm64) arch="aarch64-unknown-linux-gnu" ;;
  *) echo "✗ unsupported arch: $arch" >&2; exit 1 ;;
esac

bin="unibear-${os}_${arch}"
url="https://github.com/$owner/$repo/releases/$tag/$bin"

echo "→ downloading $url"
curl -fsSL "$url" -o /tmp/unibear
chmod +x /tmp/unibear
echo "→ installing to /usr/local/bin/unibear"
sudo mv /tmp/unibear /usr/local/bin/unibear

echo "✔ unibear ${version} installed"
