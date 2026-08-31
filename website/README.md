# HyperMarkdown website

Static Docusaurus site for GitHub Pages:

https://aeven-ai.github.io/HyperMarkdown/

```bash
# from the repository root
npm run build
npm --prefix website install
npm run website:dev
```

The playground and homepage renderer consume the locally built package. GitHub Pages is deployed from `.github/workflows/pages.yml` whenever `website/**` or the published benchmark results change.
