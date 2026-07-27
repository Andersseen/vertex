import { stat } from 'node:fs/promises';

await stat(new URL('../dist/index.d.ts', import.meta.url));

const budgets = [
  {
    file: new URL('../dist/web-editor.min.js', import.meta.url),
    label: 'vertex-editor',
    maximumBytes: 1_250 * 1024,
  },
  {
    file: new URL('../dist/web-editor-lite.min.js', import.meta.url),
    label: 'vertex-editor-lite',
    maximumBytes: 500 * 1024,
  },
];

let failed = false;

for (const budget of budgets) {
  const { size } = await stat(budget.file);
  const actualKiB = (size / 1024).toFixed(1);
  const maximumKiB = (budget.maximumBytes / 1024).toFixed(0);

  if (size > budget.maximumBytes) {
    failed = true;
    console.error(`${budget.label}: ${actualKiB} KiB exceeds ${maximumKiB} KiB`);
  } else {
    console.log(`${budget.label}: ${actualKiB} KiB / ${maximumKiB} KiB`);
  }
}

if (failed) process.exitCode = 1;
