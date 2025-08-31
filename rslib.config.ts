import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: ['node 22'],
      dts: true,
    },
    {
      format: 'cjs',
      syntax: ['node 22'],
      dts: true,
    },
  ],
  source: {
    entry: {
      index: 'src/index.ts',
      cli: 'src/cli/index.ts',
    },
  },
});
