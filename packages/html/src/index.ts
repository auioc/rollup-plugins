import {
    minify as minifyHTML,
    type Options as MinifierOptions,
} from 'html-minifier-terser';
import fs from 'node:fs';
import { default as Path } from 'node:path';
import type { EmittedFile, Plugin } from 'rollup';

const NAME = 'html';

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
                    if (chunk.isEntry || chunk.isDynamicEntry) {
                        jsFiles.push(fileName);
                    }
                } else if (chunk.type === 'asset') {
                    if (fileName.endsWith('.css')) {
                        cssFiles.push(fileName);
                    }
                }
            }

            if (injectStyle && cssFiles.length > 0) {
                const tags = cssFiles
                    .map((file) => `<link rel="stylesheet" href="${file}">`)
                    .join('\n');
                if (html.includes(styleTagPlaceholder)) {
                    html = html.replace(styleTagPlaceholder, tags);
                } else if (html.includes('</head>')) {
                    html = html.replace('</head>', `  ${tags}\n</head>`);
                } else {
                    html = `${tags}\n${html}`;
                }
            }

            if (injectScript && jsFiles.length > 0) {
                const tags = jsFiles
                    .map(
                        (file) =>
                            `<script ${injectScript === 'module' ? 'type="module" ' : ''}src="${file}"></script>`
                    )
                    .join('\n');
                if (html.includes(scriptTagPlaceholder)) {
                    html = html.replace(scriptTagPlaceholder, tags);
                } else if (html.includes('</body>')) {
                    html = html.replace('</body>', `  ${tags}\n</body>`);
                } else {
                    html += `\n${tags}`;
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
