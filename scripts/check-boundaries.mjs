import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;

const rules = [
  {
    directory: 'packages/frontend/editor-core/src',
    forbidden: ['@angular/', '@vertex/core', '@vertex/runtime', '@vertex/ui', '@vertex/ide-ui'],
    reason: 'editor-core must remain framework and product independent',
  },
  {
    directory: 'packages/frontend/runtime/src',
    forbidden: ['@angular/', '@vertex/core', '@vertex/ui', '@vertex/ide-ui', '@vertex/web-editor'],
    reason: 'runtime must remain browser-native and Angular-free',
  },
  {
    directory: 'packages/frontend/web-editor/src',
    forbidden: ['@vertex/core', '@vertex/runtime', '@vertex/ui', '@vertex/ide-ui'],
    reason: 'the embeddable editor must not pull workbench or runtime concerns',
  },
  {
    directory: 'packages/frontend/types/src',
    forbidden: ['@angular/', '@vertex/'],
    reason: 'shared contracts must not depend on implementation packages',
  },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (['.ts', '.js', '.mjs'].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

const violations = [];

function moduleSpecifiers(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

for (const rule of rules) {
  const directory = join(root, rule.directory);
  for (const file of await sourceFiles(directory)) {
    const source = await readFile(file, 'utf8');
    for (const specifier of moduleSpecifiers(source, file)) {
      const forbidden = rule.forbidden.find((prefix) => specifier.startsWith(prefix));
      if (forbidden) {
        violations.push({
          file: relative(root, file),
          specifier,
          reason: rule.reason,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Package boundary violations:');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.specifier} (${violation.reason})`);
  }
  process.exitCode = 1;
} else {
  console.log('Package boundaries are valid.');
}
