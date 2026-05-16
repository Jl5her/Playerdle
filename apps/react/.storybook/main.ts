import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|tsx)", "../src/stories/**/*.mdx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    // Strip VitePWA from Storybook's Vite instance — service workers are not
    // meaningful in the Storybook canvas and the plugin emits warnings.
    if (Array.isArray(config.plugins)) {
      config.plugins = config.plugins.filter(
        (p) => p != null && !("name" in (p as object) && (p as { name: string }).name?.startsWith("vite-plugin-pwa")),
      )
    }
    return config
  },
}

export default config
