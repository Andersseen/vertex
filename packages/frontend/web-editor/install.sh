#!/bin/bash

# Vertex Editor Quick Install Script
# Usage: ./install.sh [target-directory]
# 
# This script copies the built web-editor.min.js from the monorepo
# to your project's public directory.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_BUILD_PATH="$SCRIPT_DIR/dist/web-editor.min.js"
TARGET_DIR="${1:-./public}"
FILE_NAME="web-editor.min.js"

echo "🚀 Vertex Editor Installer"
echo ""

# Check if build exists
if [ ! -f "$LOCAL_BUILD_PATH" ]; then
    echo "❌ Build not found!"
    echo ""
    echo "Please build the web-editor first:"
    echo "  cd packages/frontend/web-editor"
    echo "  npm run build"
    echo ""
    exit 1
fi

# Create target directory
mkdir -p "$TARGET_DIR"
echo "📁 Target directory: $TARGET_DIR"

# Copy the file
echo "📦 Copying Vertex Editor..."
cp "$LOCAL_BUILD_PATH" "$TARGET_DIR/$FILE_NAME"
echo "✅ Copied: $TARGET_DIR/$FILE_NAME"

# Create a simple example
cat > "$TARGET_DIR/example.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertex Editor Example</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #0a0a0a;
      color: #e5e5e5;
    }
    .editor-wrapper {
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>🚀 Vertex Editor</h1>
  <p>A lightweight code editor Web Component</p>
  
  <div class="editor-wrapper">
    <vertex-editor
      value="const greeting = 'Hello World!';"
      language="typescript"
      theme="dark"
      lineNumbers="true"
      height="300px"
    ></vertex-editor>
  </div>

  <script src="web-editor.min.js"></script>
</body>
</html>
EOF

echo "✅ Created: $TARGET_DIR/example.html"
echo ""
echo "📖 Usage:"
echo "  1. Open $TARGET_DIR/example.html in your browser"
echo "  2. Include the script in your project:"
echo "     <script src=\"$FILE_NAME\"></script>"
echo "  3. Use the component:"
echo "     <vertex-editor language=\"typescript\" theme=\"dark\"></vertex-editor>"
echo ""
echo "🎉 Done!"
