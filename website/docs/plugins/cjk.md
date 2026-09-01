---
title: CJK emphasis
description: Make CommonMark emphasis behave naturally around Chinese, Japanese, and Korean punctuation.
---

# CJK-friendly emphasis

CommonMark's delimiter rules assume that words are commonly separated by
spaces. That can leave valid-looking emphasis markers visible when Chinese,
Japanese, or Korean text touches full-width punctuation.

## Install

```bash
npm install remark-cjk-friendly
```

## Configure

```tsx
import { cjkPlugin } from "@aeven-ai/hypermarkdown/plugins/cjk";

const plugins = {
  cjk: cjkPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

## The problem it solves

Without the plugin, CommonMark can treat delimiters in this kind of content as
literal asterisks:

```markdown
**日本語（説明）**続き
```

The plugin adjusts emphasis tokenization before GFM processing so bold,
italic, and related delimiter handling follows the reading a CJK author
expects.

## Scope

This plugin changes Markdown emphasis parsing. It does not choose fonts,
translate renderer labels, or set document direction. Use your application CSS
for script-appropriate typography and the `translations` prop for UI labels.

Without the plugin, content remains readable; standard CommonMark emphasis
rules simply apply.

## Related guides

- [Localization](/docs/features/localization)
- [Tables and GFM](/docs/features/gfm)
- [Plugin overview](/docs/plugins)
