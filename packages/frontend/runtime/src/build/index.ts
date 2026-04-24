export { Bundler } from './bundler'
export { virtualFsPlugin, npmCdnPlugin, aliasPlugin } from './plugins'
export {
  readPackageJson,
  extractDependencyVersions,
  detectFramework,
  detectEntryPoint,
  detectEntryFromIndexHtml,
  isAstroProject,
  needsNodeRuntime,
  detectDevScript,
  detectTailwindVersion,
} from './resolver'
export type { TailwindVersion } from './resolver'
export { readTsConfigPaths, readViteAliases } from './config-resolver'
export { readTsConfig, tsConfigToEsbuildTarget } from './typescript'
export type { PackageJson } from './resolver'
export type { PathAlias } from './config-resolver'
