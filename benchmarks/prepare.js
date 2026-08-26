/**
 * Copy the built package in, rather than linking it.
 *
 * `file:..` symlinks to the package directory, which has its own
 * node_modules/react — and the bare `react` import inside the built bundle
 * then resolves there, giving the benchmark two copies of React and an
 * "invalid hook call" the moment a component with hooks renders. Copying the
 * dist output leaves nothing above it to resolve to but this project's React.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "dist");
const to = join(here, "vendor", "hypermarkdown");

if (!existsSync(from)) {
  console.error("build the package first: npm run build in the parent");
  process.exit(1);
}

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });

// See vendor/tippy-interop.js for why.
const bundle = join(to, "hypermarkdown.js");
writeFileSync(
  bundle,
  readFileSync(bundle, "utf8").replaceAll(
    'from "tippy.js"',
    'from "../tippy-interop.js"'
  )
);

console.error(`copied dist -> vendor/hypermarkdown`);
