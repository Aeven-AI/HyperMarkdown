import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const section = (label: string) => ({
  type: "html" as const,
  value: label,
  className: "docs-sidebar-section",
  defaultStyle: false,
});

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "doc",
      id: "introduction",
      className: "docs-sidebar-primary",
    },
    "installation",
    "finished",
    "streaming",
    "ssr",

    section("Customization"),
    "configuration",
    "styling",
    "components",

    section("Plugins"),
    "plugins",
    "plugins/code",
    "plugins/mermaid",
    "plugins/math",
    "plugins/cjk",

    section("Features"),
    "features/incomplete-markdown",
    "features/animation",
    "features/code-blocks",
    "features/gfm",
    "features/interactivity",
    "reasoning",
    "features/link-safety",
    "features/localization",

    section("Migration"),
    "migration/react-markdown",
    "migration/streamdown",

    section("Reference"),
    "handle",
    "api",
    "performance",
    "benchmarks",
    "security",
  ],
};

export default sidebars;
