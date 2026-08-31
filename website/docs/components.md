---
title: Custom components
---

# Custom components

Replace rendered tags with stable React component references:

```tsx
const components = {
  a: AppLink,
  img: ProxiedImage,
  code: InlineCode,
};

<HyperMarkdown md={markdown} components={components} />
```

HyperMarkdown already supplies specialized links, images, fenced code, tables, diagrams, and reasoning. Your override wins over the built-in component for that tag.

## Keep identities stable

Do not create component functions inside the rendering component:

```tsx
// Avoid: a new component identity on every render.
<HyperMarkdown
  md={markdown}
  components={{ a: (props) => <AppLink {...props} /> }}
/>
```

Define the component and mapping outside the render, or memoize the mapping. Rehype React keys elements by component identity; changing it remounts the rendered element and discards local state.

## Typical uses

- Route internal links through a client router.
- Proxy or lazy-load model-provided images.
- Add analytics to links.
- Replace inline code styling.
- Introduce design-system headings and callouts.

The exported `RendererComponents` and `CodeComponentProps` types help keep overrides aligned with the renderer. `CodeComponentProps` is a union: narrow on `inline` before reading `className`, so a language-less fence is not mistaken for inline code.
