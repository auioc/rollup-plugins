import {
    minify as minifyHTML,
    type Options as MinifierOptions,
} from 'html-minifier-terser';
import fs from 'node:fs';
import { default as Path } from 'node:path';
import type { EmittedFile, Plugin } from 'rollup';

const NAME = 'html';

export type Asset =
    | string
    | {
          url: string;
          integrity?: string;
          crossorigin?: 'anonymous' | 'use-credentials';
      };

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
     * @default true
     */
    injectStyle?: boolean;
    /**
     * Whether to inject bundled JS files.
     * Use `'module'` to add `type="module"`.
     * @default true
     */
    injectScript?: boolean | 'module';
    /**
     * External assets to inject.
     * @default {}
     */
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

            const jsFiles = [];
            const cssFiles = [];

            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
                    if (chunk.isEntry) {
                        jsFiles.push(fileName);
                    }
                } else if (chunk.type === 'asset') {
                    if (fileName.endsWith('.css')) {
                        cssFiles.push(fileName);
                    }
                }
            }

            const external = options.external ?? { style: [], script: [] };

            if (injectStyle) {
                const externalTags = (external.style ?? []).map(styleTag);
                const bundledTags = cssFiles.map(styleTag);
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
                const _toScriptTag = (asset: Asset) =>
                    scriptTag(asset, injectScript === 'module');
                const externalTags = (external.script ?? []).map(_toScriptTag);
                const bundledScriptTags = jsFiles.map(_toScriptTag);
                const tags = [...externalTags, ...bundledScriptTags].join('\n');

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
                const minifyOptions = typeof minify === 'object' ? minify : {};
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
