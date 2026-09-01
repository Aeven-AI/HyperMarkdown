// Generated from benchmarks/results/latest.json. Do not edit by hand.
export const benchmark = {
  "completedAt": "2026-09-01T10:27:09.832Z",
  "environment": {
    "node": "v26.7.0",
    "platform": "darwin",
    "release": "25.5.0",
    "arch": "arm64",
    "cpu": "Apple M2 Max",
    "cores": 12,
    "memoryGiB": 32
  },
  "merged": {
    "refreshed": [
      "HyperMarkdown"
    ],
    "refreshedAt": "2026-09-01T10:27:09.832Z",
    "previousCompletedAt": "2026-08-31T11:24:49.795Z",
    "keptRenderers": [
      "streamdown",
      "markstream-react",
      "deepseek-harness",
      "react-markdown",
      "markdown-it",
      "librechat"
    ]
  },
  "renderers": [
    "HyperMarkdown",
    "markstream-react",
    "streamdown",
    "deepseek-harness",
    "react-markdown"
  ],
  "fixtures": [
    {
      "fixture": "code-large.md",
      "label": "Large code block",
      "values": {
        "HyperMarkdown": 216,
        "markstream-react": 769,
        "streamdown": 3242,
        "deepseek-harness": 4416,
        "react-markdown": 2054
      },
      "speedup": 3.6
    },
    {
      "fixture": "prose-mixed.md",
      "label": "Mixed prose",
      "values": {
        "HyperMarkdown": 140,
        "markstream-react": 313,
        "streamdown": 559,
        "deepseek-harness": 249,
        "react-markdown": 2629
      },
      "speedup": 1.8
    },
    {
      "fixture": "real-code-os.md",
      "label": "Captured AI code",
      "values": {
        "HyperMarkdown": 533,
        "markstream-react": 4417,
        "streamdown": 12511,
        "deepseek-harness": 14621,
        "react-markdown": 8008
      },
      "speedup": 8.3
    },
    {
      "fixture": "real-table-head.md",
      "label": "Captured AI table",
      "values": {
        "HyperMarkdown": 666,
        "markstream-react": 4948,
        "streamdown": 11621,
        "deepseek-harness": 19644,
        "react-markdown": 10236
      },
      "speedup": 7.4
    },
    {
      "fixture": "table-large.md",
      "label": "Large table",
      "values": {
        "HyperMarkdown": 846,
        "markstream-react": 9276,
        "streamdown": 33142,
        "deepseek-harness": 55918,
        "react-markdown": 29747
      },
      "speedup": 11
    }
  ]
} as const;
