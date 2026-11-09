import {
    minify as minifyHTML,
    type Options as MinifierOptions,
} from 'html-minifier-terser';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { default as Path } from 'node:path';
import type { EmittedFile, Plugin } from 'rollup';

const NAME = 'html';

const DEFAULT_TERSER_OPTIONS: MinifierOptions = {
    collapseWhitespace: true,
    removeComments: true,
};

export type Asset =
    | string
    | {
          url: string;
          integrity?: string;
          crossorigin?: 'anonymous' | 'use-credentials';
      };

export type CacheBusting =
    | boolean
    | string
    | ((
          fileName: string,
          content: string | Uint8Array
      ) => string | undefined | false);

export interface Options {
    /**
     * Path of template `.html` file
     */
    template: string;
    /**
     * Output file name
     * @default 'index.html'
     */
    output?: string;
    /**
     * Whether to inject bundled CSS files.
     *
     * Pass a function to decide per-asset whether to inject it.
     * The function receives the asset URL (for external assets) or the
     * bundled file name.
     * @default true
     */
    injectStyle?: boolean | ((id: string) => boolean);
    /**
     * Whether to inject bundled JS files.
     *
     * Use `'module'` to add `type="module"`.
     *
     * Pass a function to decide per-asset whether (and how) to inject it.
     * The function receives the asset URL (for external assets) or the
     * bundled file name, return `false` to skip injection,
     * `'module'` to inject with `type="module"`, or `true` to inject a
     * normal script tag.
     * @default true
     */
    injectScript?: boolean | 'module' | ((id: string) => boolean | 'module');
    external?: {
        style?: Asset[];
        script?: Asset[];
    };
    /**
     * Placeholder comment replaced by CSS tags.
     * @default '<!-- inject:style -->'
     */
    styleTagPlaceholder?: string;
    /**
     * Placeholder comment replaced by script tags.
     * @default '<!-- inject:script -->'
     */
    scriptTagPlaceholder?: string;
    /**
     * Tag name used for strip comment blocks.
     *
     * Content within `<!-- strip --><!-- /strip -->` (including the markup) will be removed from the final output.
     * @default 'strip'
     */
    stripTag?: string;
    /**
     * Minify the output HTML.
     * @see {@link MinifierOptions}
     * @default false
     */
    minify?: boolean | MinifierOptions;
    /**
     * Append a query string to bundled asset URLs to bust caches.
     *
     * External assets are not affected.
     * @default false
     */
    cacheBusting?: CacheBusting;
}

function appendQuery(url: string, query: string) {
    const hashIndex = url.indexOf('#');
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${query}${hash}`;
}

function cacheBustingQuery(
    cacheBusting: CacheBusting,
    fileName: string,
    content: string | Uint8Array
) {
    if (typeof cacheBusting === 'string') {
        return cacheBusting;
    }
    if (typeof cacheBusting === 'function') {
        return cacheBusting(fileName, content) || '';
    }
    return `v=${createHash('sha256').update(content).digest('hex').slice(0, 8)}`;
}

function assetURL(
    fileName: string,
    content: string | Uint8Array,
    cacheBusting: CacheBusting
) {
    if (!cacheBusting) {
        return fileName;
    }
    const query = cacheBustingQuery(cacheBusting, fileName, content);
    return query ? appendQuery(fileName, query) : fileName;
}

function styleTag(asset: Asset) {
    if (typeof asset === 'string') {
        return `<link rel="stylesheet" href="${asset}">`;
    }
    const integrity = asset.integrity ? ` integrity="${asset.integrity}"` : '';
    const crossorigin = asset.crossorigin
        ? ` crossorigin="${asset.crossorigin}"`
        : '';
    return `<link rel="stylesheet" href="${asset.url}"${integrity}${crossorigin}>`;
}

function scriptTag(asset: Asset, module: boolean) {
    if (typeof asset === 'string') {
        return `<script ${module ? 'type="module" ' : ''}src="${asset}"></script>`;
    }
    const integrity = asset.integrity ? ` integrity="${asset.integrity}"` : '';
    const crossorigin = asset.crossorigin
        ? ` crossorigin="${asset.crossorigin}"`
        : '';
    return `<script ${module ? 'type="module" ' : ''}src="${asset.url}"${integrity}${crossorigin}></script>`;
}

export default function createHTML(options: Options): Plugin {
    const {
        template: templateFile,
        output = 'index.html',
        injectStyle = true,
        injectScript = true,
        styleTagPlaceholder = '<!-- inject:style -->',
        scriptTagPlaceholder = '<!-- inject:script -->',
        stripTag = 'strip',
        minify = false,
        cacheBusting = false,
    } = options;

    let template = '';

    return {
        name: NAME,

        buildStart() {
            if (!templateFile) {
                throw new Error('Missing `template` option');
            }
            try {
                const path = Path.resolve(process.cwd(), templateFile);
                template = fs.readFileSync(path, 'utf-8');
            } catch (error) {
                this.error(String(error));
            }
        },

        async generateBundle(outputOptions, bundle) {
            let html = template;

            // Remove <!-- strip --> ... <!-- /strip -->
            const stripRegex = new RegExp(
                `<!--\\s*${stripTag}\\s*-->[\\s\\S]*?<!--\\s*/${stripTag}\\s*-->`,
                'g'
            );
            html = html.replace(stripRegex, '');

            const jsFiles: string[] = [];
            const cssFiles: string[] = [];

            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
                    if (chunk.isEntry) {
                        jsFiles.push(
                            assetURL(fileName, chunk.code, cacheBusting)
                        );
                    }
                } else if (chunk.type === 'asset') {
                    if (fileName.endsWith('.css')) {
                        cssFiles.push(
                            assetURL(fileName, chunk.source, cacheBusting)
                        );
                    }
                }
            }

            const external = options.external ?? { style: [], script: [] };

            if (injectStyle) {
                const predicate =
                    typeof injectStyle === 'function'
                        ? injectStyle
                        : () => true;

                const externalTags = (external.style ?? [])
                    .filter((x) => predicate(typeof x === 'string' ? x : x.url))
                    .map(styleTag);
                const bundledTags = cssFiles.filter(predicate).map(styleTag);
                const tags = [...externalTags, ...bundledTags].join('\n');

                if (tags) {
                    if (html.includes(styleTagPlaceholder)) {
                        html = html.replace(styleTagPlaceholder, tags);
                    } else if (html.includes('</head>')) {
                        html = html.replace('</head>', `  ${tags}\n</head>`);
                    } else {
                        html = `${tags}\n${html}`;
                    }
                }
            }

            if (injectScript) {
                const predicate =
                    typeof injectScript === 'function'
                        ? injectScript
                        : () => injectScript;

                const _toScriptTag = (asset: Asset) => {
                    const type = predicate(
                        typeof asset === 'string' ? asset : asset.url
                    );
                    if (type) {
                        return scriptTag(asset, type === 'module');
                    }
                    return undefined;
                };

                const externalTags = (external.script ?? []).map(_toScriptTag);
                const bundledScriptTags = jsFiles.map(_toScriptTag);
                const tags = [...externalTags, ...bundledScriptTags]
                    .filter((x) => !!x)
                    .join('\n');

                if (tags) {
                    if (html.includes(scriptTagPlaceholder)) {
                        html = html.replace(scriptTagPlaceholder, tags);
                    } else if (html.includes('</body>')) {
                        html = html.replace('</body>', `  ${tags}\n</body>`);
                    } else {
                        html += `\n${tags}`;
                    }
                }
            }

            if (minify) {
                const minifyOptions =
                    typeof minify === 'object'
                        ? minify
                        : DEFAULT_TERSER_OPTIONS;
                html = await minifyHTML(html, minifyOptions);
            }

            const asset: EmittedFile = {
                type: 'asset',
                fileName: output,
                name: output,
                source: html,
                needsCodeReference: false,
            };

            this.emitFile(asset);
        },
    };
}
