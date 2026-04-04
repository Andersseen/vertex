# Vertex

A modern IDE built with Tauri, Angular, and CodeMirror 6.

## Quick Install - Vertex Editor Web Component

Install the standalone web component to any project:

```bash
# One-liner installation
curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
```

Then use it in your HTML:
```html
<script src="web-editor.min.js"></script>
<vertex-editor 
  value="const x = 1;" 
  language="typescript"
  theme="dark"
></vertex-editor>
```

## Installation Methods

### 1. curl + node (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
```

### 2. Download and run
```bash
curl -O https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs
node install.mjs ./public
```

### 3. Clone and build locally
```bash
git clone https://github.com/andersseen/vertex.git
cd vertex/packages/frontend/web-editor
npm install
npm run build
node ../../scripts/install.mjs ~/my-project/public --local
```

## Project Structure

```
vertex/
├── apps/
│   └── desktop/          # Tauri desktop app
├── packages/
│   ├── frontend/
│   │   └── web-editor/   # Standalone web component
│   └── backend/
└── scripts/
    └── install.mjs       # CLI installer
```

## Development

```bash
# Install dependencies
npm install

# Build web-editor
cd packages/frontend/web-editor
npm run build

# Run desktop app
cd apps/desktop
npm run tauri dev
```

## Web Component Documentation

See [packages/frontend/web-editor/README.md](./packages/frontend/web-editor/README.md) for full API documentation and examples.

## License

MIT
