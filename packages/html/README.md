# @auioc/rollup-plugin-html

[![License](https://img.shields.io/github/license/auioc/rollup-plugins?style=flat-square)](https://github.com/auioc/rollup-plugins/blob/main/packages/html/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40auioc%2Frollup-plugin-html?style=flat-square&logo=npm)](https://www.npmjs.com/package/@auioc/rollup-plugin-html)

A Rollup plugin that generates an HTML file from a template, automatically injecting bundled JavaScript and CSS assets.

Supports placeholders, conditional stripping, and optional HTML minification.

## Install

```sh
npm install --save-dev @auioc/rollup-plugin-html
```

## Usage

```js
// rollup.config.js
import html from '@auioc/rollup-plugin-html';

export default {
  input: 'src/index.js',
  output: { dir: 'dist', format: 'es' },
  plugins: [
    html({
      template: 'src/index.html',
    }),
  ],
};
```

## Options

| Option                 | Type                           | Default                    | Description                                                                                                                                                     |
| ---------------------- | ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template`             | `string`                       |                            | Path to the template `.html` file, resolved relative to `process.cwd()`. **required**.                                                                          |
| `output`               | `string`                       | `'index.html'`             | Output file name of the emitted HTML file.                                                                                                                      |
| `injectStyle`          | `boolean`                      | `true`                     | Whether to inject bundled CSS files.                                                                                                                            |
| `injectScript`         | `boolean` \| `'module'`        | `true`                     | Whether to inject bundled JS files. Use `'module'` to add `type="module"`.                                                                                      |
| `styleTagPlaceholder`  | `string`                       | `'<!-- inject:style -->'`  | Placeholder comment replaced by CSS tags.                                                                                                                       |
| `scriptTagPlaceholder` | `string`                       | `'<!-- inject:script -->'` | Placeholder comment replaced by script tags.                                                                                                                    |
| `stripTag`             | `string`                       | `'strip'`                  | Tag name used for strip comment blocks.                                                                                                                         |
| `minify`               | `boolean` \| `MinifierOptions` | `undefined`                | Minify the output HTML with [html-minifier-terser](https://www.npmjs.com/package/html-minifier-terser). Pass an object to forward html-minifier-terser options. |

## How It Works

### 1. Injection

When the bundle is generated, the plugin collects:

- **CSS assets** (any emitted asset ending in `.css`)
- **JS chunks** that are entry points or dynamic entry points (files ending in `.js`)

These are injected into the template in one of two ways:

#### Using placeholders (Recommended)

```html
<!DOCTYPE html>
<html>
  <head>
   <title>My App</title>
    <!-- inject:style -->
  </head>
  <body>
    <div id="app"></div>
    <!-- inject:script -->
  </body>
</html>
```

The placeholders are configurable via the `styleTagPlaceholder`, `scriptTagPlaceholder` options.

#### Using fallbacks

If placeholders are not present, tags are inserted before `</head>` (CSS) or `</body>` (JS) when those tags exist; otherwise they are prepended (CSS) or appended (JS) to the document.

### 2. Stripping markup

Wrap content you want removed from the final output (e.g., development-only markup) in strip comments:

```html
<!-- strip -->
<p>This will be removed in the final build.</p>
<!-- /strip -->
```

The tag name is configurable via the `stripTag` option.

### 4. Minification

Enable minification to shrink the final HTML:

```js
html({
    template: 'src/index.html',
    minify: true,
});
```

Or pass custom options:

```js
html({
    template: 'src/index.html',
    minify: {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
    },
});
```

See [`html-minifier-terser` options](https://github.com/terser/html-minifier-terser#options-quick-reference) for the full list.

## License

Package `@auioc/rollup-plugin-html` is licensed under the **MIT License**.
The full license is in the [LICENSE](./LICENSE) file.
