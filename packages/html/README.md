# @auioc/rollup-plugin-html

[![License](https://img.shields.io/github/license/auioc/rollup-plugins?style=flat-square)](https://github.com/auioc/rollup-plugins/blob/main/packages/html/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/%40auioc%2Frollup-plugin-html?style=flat-square&logo=npm)](https://www.npmjs.com/package/@auioc/rollup-plugin-html)

A Rollup plugin that generates an HTML file from a template, automatically injecting bundled JavaScript and CSS assets.

Supports external assets, placeholders, conditional stripping, and optional HTML minification.

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
  output: { file: 'bundle.js', format: 'iife', name: 'bundle' },
  plugins: [
    html({
      template: 'src/index.html',
    }),
  ],
};
```

## Options

| Option                 | Type                                                 | Default                    | Description                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template`             | `string`                                             |                            | **Required**. Path to the template `.html` file, resolved relative to `process.cwd()`.                                                                          |
| `output`               | `string`                                             | `'index.html'`             | Output file name of the emitted HTML file.                                                                                                                      |
| `injectStyle`          | `boolean`                                            | `true`                     | Whether to inject styles.                                                                                                                                       |
| `injectScript`         | `boolean` \| `'module'`                              | `true`                     | Whether to inject scripts. Use `'module'` to add `type="module"`.                                                                                               |
| `external`             | `{ style?: Asset[]; script?: Asset[] }`              | `{ }`                      | External assets to inject. Their tags are placed before the bundled ones. See [External Assets](#external-assets).                                              |
| `styleTagPlaceholder`  | `string`                                             | `'<!-- inject:style -->'`  | Placeholder comment replaced by CSS tags.                                                                                                                       |
| `scriptTagPlaceholder` | `string`                                             | `'<!-- inject:script -->'` | Placeholder comment replaced by script tags.                                                                                                                    |
| `stripTag`             | `string`                                             | `'strip'`                  | Tag name used for strip comment blocks.                                                                                                                         |
| `minify`               | `boolean` \| `MinifierOptions`                       | `false`                    | Minify the output HTML with [html-minifier-terser](https://www.npmjs.com/package/html-minifier-terser). Pass an object to forward html-minifier-terser options. |
| `cacheBusting`         | `CacheBusting` (`boolean` \| `string` \| `Function`) | `false`                    | Append a query string to bundled asset URLs. See [Cache busting](#4-cache-busting).                                                                             |

- Asset

    ```typescript
    type Asset =
        | string // treated as URL
        | {
              url: string;
              integrity?: string;
              crossorigin?: 'anonymous' | 'use-credentials';
          };
    ```

- CacheBusting

    ```typescript
    type CacheBusting =
        | boolean
        | string
        | ((
              fileName: string,
              content: string | Uint8Array
          ) => string | undefined | false);
    ```

## How It Works

### 1. Injection

Assets are injected into the template in one of two ways:

- **Using placeholders** (Recommended)

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

- **Using fallbacks**

    If placeholders are not present, tags are inserted before `</head>` (CSS) or `</body>` (JS) when those tags exist;

    Otherwise they are prepended (CSS) or appended (JS) to the document.

#### Bundled Assets

When the bundle is generated, the plugin collects:

- **CSS assets** (any emitted asset ending in `.css`)
- **JS chunks** that are entry points (files ending in `.js`)

#### External Assets

Use the `external` option to inject assets that are not produced by Rollup (e.g. CDN scripts, third-party stylesheets).

External tags are always emitted **before** the bundled tags within the same injection slot.

```js
html({
    template: 'src/index.html',
    external: {
        style: [
            'https://cdn.example.com/reset.css',
            {
                url: 'https://cdn.example.com/theme.css',
                integrity: 'sha384-...',
                crossorigin: 'anonymous',
            },
        ],
        script: [
            'https://cdn.example.com/polyfill.js',
            {
                url: 'https://cdn.example.com/vendor.js',
                integrity: 'sha384-...',
                crossorigin: 'anonymous',
            },
        ],
    },
});
```

### 2. Stripping markup

Content (e.g., development-only markup) within stripping markup (including the markup) will be removed from the final output:

```html
<!-- strip -->
<p>This will be removed in the final build.</p>
<!-- /strip -->
```

The tag name is configurable via the `stripTag` option.

### 3. Minification

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

### 4. Cache busting

>**NOTE:** External assets injected through the `external` option are not affected.

Enable cache busting to append a query string to the URLs of bundled assets. The content hash is generated automatically:

```js
html({
    template: 'src/index.html',
    cacheBusting: true,
});
```

This produces tags such as `<script src="bundle.js?v=1a2b3c4d"></script>`.

You can also provide the query string yourself. The value is appended without the leading `?`:

```js
html({
    template: 'src/index.html',
    cacheBusting: 'v=1.2.3',
});
```

For per-asset control, pass a function receiving the asset file name and its content. Return an empty string to skip that asset:

```js
html({
    template: 'src/index.html',
    cacheBusting: (fileName, content) =>
        fileName.endsWith('.js') ? `v=${content.length}` : 'v=1.2.3',
});
```

## License

Package `@auioc/rollup-plugin-html` is licensed under the **MIT License**.
The full license is in the [LICENSE](./LICENSE) file.
