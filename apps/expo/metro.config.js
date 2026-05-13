const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")
const { withNativewind } = require("nativewind/metro")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

config.resolver.disableHierarchicalLookup = true

config.resolver.unstable_enablePackageExports = true

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
})
