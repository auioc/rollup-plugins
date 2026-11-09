# @auioc/rollup-plugin-sass

[![License](https://img.shields.io/github/license/auioc/rollup-plugins?style=flat-square)](https://github.com/auioc/rollup-plugins/blob/main/packages/sass/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40auioc%2Frollup-plugin-sass?style=flat-square&logo=npm)](https://www.npmjs.com/package/@auioc/rollup-plugin-sass)

A Rollup plugin that compiles Sass (`.scss` / `.sass`) entry files and emits the result as a CSS asset.

CSS can be provided directly as a string or read from a file, and optionally minified.

## Install

```sh
npm install --save-dev @auioc/rollup-plugin-sass
```

## Usage

```js
// rollup.config.js
import sass from '@auioc/rollup-plugin-sass';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    sass({
      input: 'src/styles/main.scss',
    }),
  ],
};
```

## Options

| Option        | Type                                      | Default              | Description                                                                                                                                                                                                      |
| ------------- | ----------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`       | `string`                                  |                      | **Required**. Path to the Sass entry file (`.scss` or `.sass`)<br/>Relative to `process.cwd()` or absolute.                                                                                                      |
| `output`      | `string`                                  | Derived from `input` | Output file name for the emitted CSS asset. Should be a path relative to Rollup's output directory.<br/>When omitted, the name is derived from `input` by replacing the `.scss` / `.sass` extension with `.css`. |
| `sourceMap`   | `boolean` \| `'inline'`                   | `false`              | Controls source map generation for the compiled CSS.                                                                                                                                                             |
| `sassOptions` | `Omit<SassOptions<'async'>, 'sourceMap'>` | `{}`                 | Additional options forwarded directly to Sass.<br/>See the [Sass documentation](https://sass-lang.com/documentation/js-api/) for the full list of supported options.                                             |

- `sourceMap`

  - `false`: No source map is generated.
  - `true`: An external `.map` file is emitted alongside the CSS.
  - `'inline'`:The source map is embedded into the CSS as a data URI.

## License

Package `@auioc/rollup-plugin-sass` is licensed under the **MIT License**.
The full license is in the [LICENSE](./LICENSE) file.
