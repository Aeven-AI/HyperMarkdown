import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "HyperMarkdown",
  tagline: "Ridiculously fast Markdown for React and AI.",
  favicon: "img/favicon.svg",
  url: "https://aeven-ai.github.io",
  baseUrl: "/HyperMarkdown/",
  organizationName: "Aeven-AI",
  projectName: "HyperMarkdown",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        docsRouteBasePath: "/docs",
        indexPages: true,
      },
    ],
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/Aeven-AI/HyperMarkdown/edit/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "HyperMarkdown",
      logo: {
        alt: "HyperMarkdown",
        src: "img/logo.svg",
      },
      items: [
        { type: "docSidebar", sidebarId: "docs", label: "Docs", position: "left" },
        { to: "/docs/performance", label: "Performance", position: "left" },
        { to: "/playground", label: "Playground", position: "left" },
        {
          href: "https://www.npmjs.com/package/@aeven-ai/hypermarkdown",
          label: "npm",
          position: "right",
        },
        {
          href: "https://github.com/Aeven-AI/HyperMarkdown",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Product",
          items: [
            { label: "Playground", to: "/playground" },
            { label: "Documentation", to: "/docs/introduction" },
            { label: "Performance", to: "/docs/performance" },
          ],
        },
        {
          title: "Install",
          items: [
            {
              label: "npm",
              href: "https://www.npmjs.com/package/@aeven-ai/hypermarkdown",
            },
            {
              label: "GitHub",
              href: "https://github.com/Aeven-AI/HyperMarkdown",
            },
          ],
        },
      ],
      copyright: `Parse the change. Not the conversation. MIT © Æven`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "json", "tsx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
