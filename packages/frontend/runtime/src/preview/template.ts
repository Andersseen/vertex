export function generateIndexHtml(options: {
  title: string
  entryScript: string
  cssFiles?: string[]
}): string {
  const cssLinks = (options.cssFiles ?? [])
    .map((css) => `  <link rel="stylesheet" href="${css}">`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
${cssLinks}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${options.entryScript}"></script>
</body>
</html>`
}
