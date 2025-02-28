import type { Plugin } from '../core/vite';
import MagicString from 'magic-string';

// https://github.com/vitejs/vite/discussions/5109#discussioncomment-1450726
function isSSR(options: undefined | boolean | { ssr: boolean }): boolean {
  if (options === undefined) {
    return false;
  }
  if (typeof options === 'boolean') {
    return options;
  }
  if (typeof options == 'object') {
    return !!options.ssr;
  }
  return false;
}

// This matches any JS-like file (that we know of)
// See https://regex101.com/r/Cgofir/1
const SUPPORTED_FILES = /\.(astro|svelte|vue|[cm]?js|jsx|[cm]?ts|tsx)$/;
const IGNORED_MODULES = [/astro\/dist\/runtime\/server/, /\/node-fetch\//];
const DEFINE_FETCH = `import fetch from 'node-fetch';\n`;

export default function pluginFetch(): Plugin {
  return {
    name: '@astrojs/vite-plugin-fetch',
    enforce: 'post',
    async transform(code, id, opts) {
      const ssr = isSSR(opts);
      // If this isn't an SSR pass, `fetch` will already be available!
      if (!ssr) {
        return null;
      }
      // Only transform JS-like files
      if (!id.match(SUPPORTED_FILES)) {
        return null;
      }
      // Optimization: only run on probable matches
      if (!code.includes('fetch')) {
        return null;
      }
      // Ignore specific modules
      for (const ignored of IGNORED_MODULES) {
        if (id.match(ignored)) {
          return null;
        }
      }
      const s = new MagicString(code);
      s.prepend(DEFINE_FETCH);
      const result = s.toString();
      const map = s.generateMap({
        source: id,
        includeContent: true,
      });
      return { code: result, map };
    },
  };
}
