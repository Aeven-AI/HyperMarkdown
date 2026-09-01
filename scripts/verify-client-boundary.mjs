import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../dist/hypermarkdown.js", import.meta.url), "utf8");

if (!entry.startsWith('"use client";')) {
  throw new Error(
    'dist/hypermarkdown.js must begin with "use client" for Next.js App Router consumers.',
  );
}
