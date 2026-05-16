import a11y from "@storybook/addon-a11y"
import docs from "@storybook/addon-docs"
import { definePreview } from "@storybook/react-vite"
import type { Decorator } from "@storybook/react-vite"
import "@fortawesome/fontawesome-free/css/all.min.css"
import "../src/index.css"

const withColorScheme: Decorator = (Story, context) => {
  const isDark = context.globals.colorScheme === "dark"
  if (isDark) {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  return <Story />
}

const preview = definePreview({
  addons: [docs(), a11y()],
  globalTypes: {
    colorScheme: {
      description: "Color scheme",
      toolbar: {
        title: "Color scheme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: "light",
  },
  parameters: {
    backgrounds: {
      options: {
        light: { name: "Light", value: "#f2f6fb" },
        dark: { name: "Dark", value: "#18263c" },
      },
      default: "light",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withColorScheme],
})

export default preview
