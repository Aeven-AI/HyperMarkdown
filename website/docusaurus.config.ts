import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const baseUrl = "/HyperMarkdown/";
const geistSans = `${baseUrl}fonts/geist-latin-wght-normal.woff2`;
const geistMono = `${baseUrl}fonts/geist-mono-latin-wght-normal.woff2`;

const config: Config = {
  title: "HyperMarkdown",
  tagline: "Ridiculously fast Markdown for React and AI.",
  favicon: "img/favicon.svg",
  url: "https://aeven-ai.github.io",
  baseUrl,
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "preload",
        href: geistSans,
        as: "font",
        type: "font/woff2",
        crossorigin: "anonymous",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preload",
        href: geistMono,
        as: "font",
        type: "font/woff2",
        crossorigin: "anonymous",
      },
    },
    {
      tagName: "style",
      attributes: { type: "text/css" },
      innerHTML: `@font-face{font-family:Geist;src:url("${geistSans}") format("woff2");font-weight:100 900;font-style:normal;font-display:optional}@font-face{font-family:"Geist Mono";src:url("${geistMono}") format("woff2");font-weight:100 900;font-style:normal;font-display:optional}`,
    },
  ],
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
        indexBlog: false,
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
        /*
         * Google Analytics. The preset's own plugin rather than a script tag
         * in `headTags`: the site is a single-page app after first paint, so
         * a bare gtag snippet would record the entry page and nothing after
         * it. This sends a page_view on every client-side navigation too.
         *
         * It is a production-only plugin. `docusaurus start` deliberately
         * loads no tag, so local browsing never reaches the property.
         */
        gtag: {
          trackingID: "G-FXDEPBSKWG",
          anonymizeIP: true,
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
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          label: "Docs",
          position: "left",
        },
        { to: "/playground", label: "Playground", position: "left" },
        {
          href: "https://www.npmjs.com/package/@aeven-ai/hypermarkdown",
          label: "NPM",
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
      copyright: `© 2026 Æven`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "json", "tsx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
