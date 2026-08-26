/**
 * tippy.js is CommonJS. A bundler unwraps `module.exports.default` when the
 * importing code says `import tippy from "tippy.js"`; Node's raw ESM interop
 * does not, and hands back the module object instead of the function.
 *
 * The app builds through Vite and never sees this. The benchmark loads the
 * built bundle directly in Node, so it does — hence this shim, which
 * prepare.js points the copied bundle at. Nothing about the measurement
 * changes: the same tooltips are constructed either way.
 */
import mod from "tippy.js";

export default mod?.default ?? mod;
