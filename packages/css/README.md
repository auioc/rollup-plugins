# @auioc/rollup-plugin-css

[![License](https://img.shields.io/github/license/auioc/rollup-plugins?style=flat-square)](https://github.com/auioc/rollup-plugins/blob/main/packages/css/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40auioc%2Frollup-plugin-css?style=flat-square&logo=npm)](https://www.npmjs.com/package/@auioc/rollup-plugin-css)

A Rollup plugin that add CSS to the bundle output.

CSS can be provided directly as a string or read from a file, and optionally minified.

## Install

```sh
npm install --save-dev @auioc/rollup-plugin-css
```

## Usage

```js
// rollup.config.js
import css from '@auioc/rollup-plugin-css';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    css({
      file: 'src/styles.css',
      output: 'styles.css',
      minify: true,
    }),
  ],
};
```

## Options

| Option   | Type                                  | Default        | Description                                                                                                            |
| -------- | ------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `source` | `string`                              |                | Raw CSS string. <br/>Mutually exclusive with `file`.                                                                   |
| `file`   | `string`                              |                | Path to a `.css` file (resolved from `process.cwd()`). <br/>Mutually exclusive with `source`.                          |
| `output` | `string`                              | `'bundle.css'` | Output file name of the emitted CSS asset.                                                                             |
| `minify` | `boolean` \| `CleanCSS.OptionsOutput` | `false`        | Minify the CSS with [clean-css](https://www.npmjs.com/package/clean-css). Pass an object to forward clean-css options. |

## License

Package `@auioc/rollup-plugin-css` is licensed under the **MIT License**.
The full license is in the [LICENSE](./LICENSE) file.
