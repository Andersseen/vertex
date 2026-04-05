#!/bin/bash
# Vertex Editor installer
# Usage: curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.sh | bash
# Usage: curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.sh | bash -s -- ./public

TARGET="${1:-./public}"

curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - "$TARGET"
