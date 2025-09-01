// @ts-check
import { defineConfig } from 'astro/config';
import pkg from '../package.json';
// import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  base: '/bit-grid-component',
  site: 'https://metaory.github.io',
  // integrations: [icon()],
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@styles': '/src/styles',
        '@layouts': '/src/layouts',
        '@pages': '/src/pages',
        '@root': '../../'
      }
    }
  }
});
