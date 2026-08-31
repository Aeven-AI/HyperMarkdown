// Generated from benchmarks/results/latest.json. Do not edit by hand.
export const benchmark = {
  "completedAt": "2026-08-31T11:24:49.795Z",
  "environment": {
    "node": "v26.7.0",
    "platform": "darwin",
    "release": "25.5.0",
    "arch": "arm64",
    "cpu": "Apple M2 Max",
    "cores": 12,
    "memoryGiB": 32
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
        "HyperMarkdown": 153,
        "markstream-react": 313,
        "streamdown": 559,
        "deepseek-harness": 249,
        "react-markdown": 2629
      },
      "speedup": 1.6
    },
    {
      "fixture": "real-code-os.md",
      "label": "Captured AI code",
      "values": {
        "HyperMarkdown": 659,
        "markstream-react": 4417,
        "streamdown": 12511,
        "deepseek-harness": 14621,
        "react-markdown": 8008
      },
      "speedup": 6.7
    },
    {
      "fixture": "real-table-head.md",
      "label": "Captured AI table",
      "values": {
        "HyperMarkdown": 654,
        "markstream-react": 4948,
        "streamdown": 11621,
        "deepseek-harness": 19644,
        "react-markdown": 10236
      },
      "speedup": 7.6
    },
    {
      "fixture": "table-large.md",
      "label": "Large table",
      "values": {
        "HyperMarkdown": 874,
        "markstream-react": 9276,
        "streamdown": 33142,
        "deepseek-harness": 55918,
        "react-markdown": 29747
      },
      "speedup": 10.6
    }
  ]
} as const;
