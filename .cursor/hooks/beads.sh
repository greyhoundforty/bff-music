#!/bin/bash
# Cursor starts hooks with a minimal PATH and does not load the zsh mise function.
# Call the beads binary directly so a mise shim does not have to trust mise.toml first.
set -euo pipefail
BD="${BD_BIN:-$HOME/.local/share/mise/installs/github-gastownhall-beads/latest/bd}"
if [[ ! -x "$BD" ]]; then
  printf '%s\n' '{"continue":true}'
  exit 0
fi
exec "$BD" cursor-hook "${1:?event required}"
