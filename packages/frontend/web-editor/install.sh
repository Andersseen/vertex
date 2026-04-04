#!/bin/bash

# Vertex Editor Quick Install Script
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/vertex-editor/main/install.sh | bash

set -e

CDN_URL="https://cdn.jsdelivr.net/npm/@vertex/web-editor@latest/dist/web-editor.min.js"
TARGET_DIR="${1:-./public}"
FILE_NAME="web-editor.min.js"

echo "🚀 Vertex Editor Installer"
echo ""

# Create target directory
mkdir -p "$TARGET_DIR"
echo "📁 Target directory: $TARGET_DIR"

# Download the file
if command -v curl &> /dev/null; then
    echo "📦 Downloading..."
    curl -sSL "$CDN_URL" -o "$TARGET_DIR/$FILE_NAME"
elif command -v wget &> /dev/null; then
    echo "📦 Downloading..."
    wget -q "$CDN_URL" -O "$TARGET_DIR/$FILE_NAME"
else
    echo "❌ Error: curl or wget is required"
    exit 1
fi

echo "✅ Downloaded: $TARGET_DIR/$FILE_NAME"

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
echo "     <script src=\"$TARGET_DIR/$FILE_NAME\"></script>"
echo ""
echo "🎉 Done!"
