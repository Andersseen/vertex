# Vertex Editor CLI

Install the Vertex Editor web component to any project from anywhere.

## Installation Methods

### Method 1: npx (Recommended - No install needed)

Install directly from GitHub to your project:

```bash
# Download from GitHub (default)
npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs ./public

# Or use shorter syntax once published
npx @vertex/web-editor ./public
```

### Method 2: Local Server (For development)

Start a local server from the monorepo and install via HTTP:

```bash
# Terminal 1: In vertex monorepo
cd packages/frontend/web-editor
node bin/install.mjs --serve --port=8080

# Terminal 2: In your project
curl http://localhost:8080/web-editor.min.js -o public/web-editor.min.js
```

### Method 3: Custom URL

Install from any URL:

```bash
node bin/install.mjs ./public --url=https://your-cdn.com/web-editor.min.js
```

### Method 4: Local Copy (Inside monorepo)

If you're inside the vertex monorepo:

```bash
cd packages/frontend/web-editor
npm run build
node bin/install.mjs ~/my-project/public --local
```

## CLI Options

```
Usage: install.mjs [target-directory] [options]

Options:
  --local       Use local monorepo build
  --remote      Download from GitHub (default outside monorepo)
  --url=<url>   Use custom URL to download
  --serve       Start local server only
  --port=<n>    Port for local server (default: 8080)
```

## Examples

### Install from GitHub

```bash
# Default: Downloads from GitHub raw
npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs ./public

Result:
./public/
  ├── web-editor.min.js
  ├── web-editor.min.js.map
  ├── vertex-editor-example.html
  ├── ReactExample.jsx
  └── VueExample.vue
```

### Use as Local Server

```bash
# Start server
node bin/install.mjs --serve --port=9000

# In another terminal or project
curl http://localhost:9000/web-editor.min.js -o my-project/public/web-editor.min.js
```

### Custom Source

```bash
# From your own CDN
node bin/install.mjs ./public --url=https://cdn.mycompany.com/web-editor.min.js

# From a specific GitHub release
node bin/install.mjs ./public \
  --url=https://github.com/user/repo/releases/download/v1.0.0/web-editor.min.js
```

## Automated Setup Script

Add to your project's `package.json`:

```json
{
  "scripts": {
    "setup:editor": "npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs public"
  }
}
```

Then run:

```bash
npm run setup:editor
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Setup Vertex Editor
on: [push]

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Vertex Editor
        run: |
          npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs public
      
      - name: Build
        run: npm run build
```

### Docker

```dockerfile
# In your Dockerfile
RUN npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs /app/public
```

## Troubleshooting

### "Build not found" error

If using `--local`, ensure you've built the web-editor first:

```bash
cd packages/frontend/web-editor
npm run build
```

### Network errors

If GitHub raw download fails, the CLI will automatically fall back to local build if available.

To force local mode:

```bash
node bin/install.mjs ./public --local
```

### CORS issues in development

Use the `--serve` mode which includes proper CORS headers:

```bash
node bin/install.mjs --serve
```
