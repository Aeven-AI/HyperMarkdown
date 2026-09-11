import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { compileAsync } from "sass";

const input = fileURLToPath(
  new URL("../styles/hypermarkdown.scss", import.meta.url),
);
const output = fileURLToPath(
  new URL("../dist/hypermarkdown.css", import.meta.url),
);

const result = await compileAsync(input, {
  sourceMap: false,
  style: "compressed",
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, result.css);

// The toolbar tooltip skin, not tippy's own base stylesheet: tippy.js is an
// optional peer, so its rules stay out of here and the host imports them.
if (!result.css.includes(".tippy-box")) {
  throw new Error("built stylesheet is missing the toolbar tooltip rules");
}
