import type { RuntimeService } from '../services/runtime.service';
import type { IVirtualFS } from '@vertex/runtime';
import { Bundler } from '@vertex/runtime/build';
import { readPackageJson, detectEntryPoint } from '@vertex/runtime/build';

export interface TerminalContext {
  runtime: RuntimeService;
  getCwd(): string;
  setCwd(cwd: string): void;
  resolvePath(input: string): string;
  output(text: string): void;
  outputError(text: string): void;
  progressBar(percent: number, width: number): string;
  humanSize(bytes: number): string;
}

export type CommandHandler = (ctx: TerminalContext, args: string[]) => Promise<void> | void;

function requireFs(ctx: TerminalContext): IVirtualFS {
  const fs = ctx.runtime.fs;
  if (!fs) throw new Error('No virtual filesystem. Clone a repository first.');
  return fs;
}

function requireGit(ctx: TerminalContext) {
  const git = ctx.runtime.git;
  if (!git) throw new Error('No git repository. Clone a repository first.');
  return git;
}

export const helpCommand: CommandHandler = (ctx) => {
  const lines = [
    '\x1b[1mAvailable commands:\x1b[0m',
    '',
    '  \x1b[33mls\x1b[0m [path]        List directory contents',
    '  \x1b[33mcd\x1b[0m [path]        Change directory',
    '  \x1b[33mpwd\x1b[0m             Print working directory',
    '  \x1b[33mcat\x1b[0m <file>      Display file contents',
    '  \x1b[33mmkdir\x1b[0m <dir>    Create directory',
    '  \x1b[33mtouch\x1b[0m <file>   Create empty file',
    '  \x1b[33mrm\x1b[0m <file>       Remove file',
    '  \x1b[33mecho\x1b[0m <text>   Print text',
    '  \x1b[33mclear\x1b[0m           Clear terminal',
    '  \x1b[33mgit status\x1b[0m      Show working tree status',
    '  \x1b[33mgit log\x1b[0m [n]    Show commit history',
    '  \x1b[33mgit branch\x1b[0m      Show current branch',
    '  \x1b[33mbuild\x1b[0m [entry]  Build project with esbuild (output to /dist)',
    '  \x1b[33mnpm run build\x1b[0m   Alias for build',
    '',
    '  \x1b[90mnode / npx → Phase 4 (Nodebox)\x1b[0m',
    '',
  ];
  ctx.output(lines.join('\r\n'));
};

export const clearCommand: CommandHandler = (ctx) => {
  ctx.output('\x1b[2J\x1b[H');
};

export const pwdCommand: CommandHandler = (ctx) => {
  const cwd = ctx.getCwd();
  ctx.output(cwd === '/' ? '~' : cwd);
};

export const lsCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  const target = args[0] ? ctx.resolvePath(args[0]) : ctx.getCwd();

  try {
    const entries = await fs.readDir(target);
    const dirs = entries.filter((e) => e.type === 'directory').sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter((e) => e.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

    let line = '';
    for (const d of dirs) {
      line += `\x1b[36m${d.name}/\x1b[0m  `;
    }
    for (const f of files) {
      line += `${fileColor(f.name)}${f.name}\x1b[0m  `;
    }
    if (entries.length > 0) ctx.output(line + '\r\n');
  } catch (err) {
    ctx.outputError(`ls: cannot access '${target}': ${(err as Error).message}`);
  }
};

function fileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return '\x1b[33m';
    case 'json':
      return '\x1b[35m';
    case 'md':
      return '\x1b[32m';
    case 'html':
      return '\x1b[31m';
    case 'css':
    case 'scss':
      return '\x1b[34m';
    default:
      return '';
  }
}

export const cdCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  if (args.length === 0) {
    ctx.setCwd('/');
    return;
  }
  const target = ctx.resolvePath(args[0]);
  try {
    const exists = await fs.exists(target);
    if (!exists) {
      ctx.outputError(`cd: no such file or directory: ${args[0]}`);
      return;
    }
    await fs.readDir(target);
    ctx.setCwd(target);
  } catch {
    ctx.outputError(`cd: not a directory: ${args[0]}`);
  }
};

export const catCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  if (args.length === 0) {
    ctx.outputError('cat: missing file operand');
    return;
  }
  for (const arg of args) {
    const path = ctx.resolvePath(arg);
    try {
      const content = await fs.readFile(path);
      ctx.output(content + '\r\n');
    } catch (err) {
      ctx.outputError(`cat: ${arg}: ${(err as Error).message}`);
    }
  }
};

export const mkdirCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  if (args.length === 0) {
    ctx.outputError('mkdir: missing operand');
    return;
  }
  for (const arg of args) {
    const path = ctx.resolvePath(arg);
    try {
      await fs.mkdir(path);
    } catch (err) {
      ctx.outputError(`mkdir: cannot create directory '${arg}': ${(err as Error).message}`);
    }
  }
};

export const touchCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  if (args.length === 0) {
    ctx.outputError('touch: missing file operand');
    return;
  }
  for (const arg of args) {
    const path = ctx.resolvePath(arg);
    try {
      const exists = await fs.exists(path);
      if (!exists) {
        await fs.writeFile(path, '');
      }
    } catch (err) {
      ctx.outputError(`touch: cannot touch '${arg}': ${(err as Error).message}`);
    }
  }
};

export const rmCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);
  if (args.length === 0) {
    ctx.outputError('rm: missing operand');
    return;
  }
  for (const arg of args) {
    const path = ctx.resolvePath(arg);
    try {
      await fs.deleteFile(path);
    } catch (err) {
      ctx.outputError(`rm: cannot remove '${arg}': ${(err as Error).message}`);
    }
  }
};

export const echoCommand: CommandHandler = (ctx, args) => {
  ctx.output(args.join(' ') + '\r\n');
};

export const gitCommand: CommandHandler = async (ctx, args) => {
  const git = requireGit(ctx);
  const subcmd = args[0]?.toLowerCase();

  try {
    switch (subcmd) {
      case 'status': {
        const status = await git.status('/');
        const all = [
          ...status.modified.map((f) => `\x1b[33m M\x1b[0m ${f}`),
          ...status.added.map((f) => `\x1b[32m A\x1b[0m ${f}`),
          ...status.deleted.map((f) => `\x1b[31m D\x1b[0m ${f}`),
          ...status.untracked.map((f) => `\x1b[90m??\x1b[0m ${f}`),
        ];
        if (all.length === 0) {
          ctx.output('Nothing to commit, working tree clean\r\n');
        } else {
          ctx.output(all.join('\r\n') + '\r\n');
        }
        break;
      }
      case 'log': {
        const limit = parseInt(args[1] || '10', 10);
        const commits = await git.log('/', limit);
        let output = '';
        for (const c of commits) {
          const date = new Date(c.author.timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');
          output += `\x1b[33m${c.oid.slice(0, 7)}\x1b[0m \x1b[37m${date}\x1b[0m \x1b[32m${c.author.name}\x1b[0m\r\n  ${c.message}\r\n\r\n`;
        }
        ctx.output(output);
        break;
      }
      case 'branch': {
        const branch = await git.currentBranch('/');
        ctx.output(`\x1b[32m* ${branch}\x1b[0m\r\n`);
        break;
      }
      default:
        ctx.outputError(`git: '${subcmd}' is not a supported command in web shell.`);
        ctx.output('Supported: status, log, branch\r\n');
    }
  } catch (err) {
    ctx.outputError(`git: ${(err as Error).message}`);
  }
};

export const buildCommand: CommandHandler = async (ctx, args) => {
  const fs = requireFs(ctx);

  const pkg = await readPackageJson(fs, '/');
  let entryPoint = args[0] ? ctx.resolvePath(args[0]) : detectEntryPoint(pkg);

  if (!(await fs.exists(entryPoint))) {
    const fallbacks = ['/src/main.tsx', '/src/main.ts', '/src/index.tsx', '/src/index.ts', '/index.ts', '/main.ts'];
    for (const fb of fallbacks) {
      if (await fs.exists(fb)) {
        entryPoint = fb;
        break;
      }
    }
  }

  if (!(await fs.exists(entryPoint))) {
    ctx.outputError(`build: entry point not found: ${entryPoint}`);
    ctx.output('Provide an entry file or create src/main.tsx, src/main.ts, index.ts, etc.\r\n');
    return;
  }

  ctx.output(`\x1b[36m▶ Building from ${entryPoint}…\x1b[0m\r\n`);

  const bundler = new Bundler(fs);
  try {
    const result = await bundler.build(
      {
        entryPoint,
        outDir: '/dist',
        format: 'esm',
        target: 'browser',
        minify: true,
        sourcemap: true,
        npmResolution: 'cdn',
        cdnUrl: 'https://esm.sh',
      },
      (phase, percent) => {
        const bar = ctx.progressBar(percent, 20);
        ctx.output(`\r\x1b[2K  \x1b[90m[${bar}]\x1b[0m ${phase} ${percent}%`);
      },
    );

    ctx.output('\r\n');

    if (result.success) {
      ctx.output(`\x1b[32m✓ Build completed in ${result.duration}ms\x1b[0m\r\n`);
      for (const file of result.files) {
        ctx.output(`  \x1b[90m→\x1b[0m ${file.path} \x1b[90m(${ctx.humanSize(file.size)})\x1b[0m\r\n`);
      }
      ctx.output(`\x1b[90m  ${result.stats.inputFiles} file(s) → ${ctx.humanSize(result.stats.outputSize)}\x1b[0m\r\n`);
    } else {
      ctx.outputError(`Build failed with ${result.errors.length} error(s)`);
      for (const err of result.errors.slice(0, 5)) {
        ctx.outputError(`  ${err.file}:${err.line}:${err.column} ${err.message}`);
      }
    }

    if (result.warnings.length > 0) {
      ctx.output(`\x1b[33m⚠ ${result.warnings.length} warning(s)\x1b[0m\r\n`);
    }
  } catch (err) {
    ctx.outputError(`build: ${(err as Error).message}`);
  }
};

export const npmCommand: CommandHandler = async (ctx, args) => {
  const subcmd = args[0]?.toLowerCase();
  if (subcmd === 'run' && args[1] === 'build') {
    await buildCommand(ctx, args.slice(2));
    return;
  }
  ctx.outputError(`npm: '${args.join(' ')}' is not supported in web shell.`);
  ctx.output('Supported: npm run build\r\n');
};

export const nodeCommand: CommandHandler = (ctx, args) => {
  const cmd = args[0] || 'node';
  ctx.outputError(`\`${cmd}\` will be available in Phase 4 (Nodebox Runtime).`);
};

export const commandRegistry: Record<string, CommandHandler> = {
  help: helpCommand,
  h: helpCommand,
  clear: clearCommand,
  pwd: pwdCommand,
  ls: lsCommand,
  cd: cdCommand,
  cat: catCommand,
  mkdir: mkdirCommand,
  touch: touchCommand,
  rm: rmCommand,
  echo: echoCommand,
  git: gitCommand,
  build: buildCommand,
  npm: npmCommand,
  node: nodeCommand,
  npx: nodeCommand,
};
