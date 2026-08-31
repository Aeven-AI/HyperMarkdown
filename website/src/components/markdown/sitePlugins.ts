import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import { katexPlugin } from "@aeven-ai/hypermarkdown/plugins/math";
import { mermaidPlugin } from "@aeven-ai/hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "@aeven-ai/hypermarkdown/plugins/cjk";
import type { PluginConfig } from "@aeven-ai/hypermarkdown";

const math = katexPlugin();
const code = highlightPlugin();
const diagram = mermaidPlugin({ theme: "neutral", fontFamily: "Geist" });
const cjk = cjkPlugin();

export function pluginsFor(flags: {
  math?: boolean;
  code?: boolean;
  mermaid?: boolean;
  cjk?: boolean;
}): PluginConfig {
  return {
    math: flags.math === false ? undefined : math,
    code: flags.code === false ? undefined : code,
    diagram: flags.mermaid === false ? undefined : diagram,
    cjk: flags.cjk === false ? undefined : cjk,
  };
}

export const defaultSitePlugins = pluginsFor({});
