// Lets `node --test` run the app's TypeScript modules directly: Node strips
// the types itself; this hook adds what the bundler normally does, the `@/`
// alias and extensionless imports. Only for pure modules (no JSX, no
// Next-only APIs).
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

const src = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, next) {
    let spec = specifier.startsWith("@/") ? new URL(specifier.slice(2), src).href : specifier;
    if ((spec.startsWith(".") || spec.startsWith("file:")) && !/\.[cm]?[jt]sx?$/.test(spec)) {
      const base = new URL(spec, context.parentURL).href;
      const found = [".ts", "/index.ts"].map((ext) => base + ext).find((url) => existsSync(new URL(url)));
      if (found) spec = found;
    }
    return next(spec, context);
  },
});
