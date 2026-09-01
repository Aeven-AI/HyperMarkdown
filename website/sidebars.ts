import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Start",
      collapsed: false,
      items: [
        "introduction",
        "installation",
        "finished",
        "streaming",
        "handle",
        "ssr",
      ],
    },
    {
      type: "category",
      label: "Migration",
      items: ["migration/react-markdown", "migration/streamdown"],
    },
    {
      type: "category",
      label: "Customize",
      items: [
        "configuration",
        "styling",
        "components",
        "plugins",
        "reasoning",
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        "security",
        "performance",
        "benchmarks",
        "api",
        "faq",
      ],
    },
  ],
};

export default sidebars;
