import { default as Path } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'rollup';
import type { Options as SassOptions } from 'sass';
import * as sass from 'sass';

const NAME = 'sass';

interface Options {
    /**
     * Path to the Sass entry file (`.scss` or `.sass`), relative to `process.cwd()` or absolute.
     *
     * @required
     * @example 'src/styles/main.scss'
     */
    input: string;

    /**
     * Output file name for the emitted CSS asset.
     *
     * Should be a path relative to Rollup's output directory.
     *
     * When omitted, the name is derived from `input` by replacing the
     * `.scss` / `.sass` extension with `.css` (e.g. `main.scss` → `main.css`).
     *
     * @default Derived from `input` (basename with `.css` extension)
     * @example 'assets/main.css'
     */
    output?: string;

    /**
     * Controls source map generation for the compiled CSS.
     *
     * - `false` — no source map is generated.
     * - `true` — an external `.map` file is emitted alongside the CSS.
     * - `'inline'` — the source map is embedded into the CSS.
     *
     * @default false
     */
    sourceMap?: boolean | 'inline';

    /**
     * Additional options forwarded directly to Sass.
     *
     * @default {}
     * @example { style: 'compressed', loadPaths: ['src/styles'] }
     */
    sassOptions?: Omit<SassOptions<'async'>, 'sourceMap'>;
}

export default function sassPlugin(options: Options): Plugin {
    const { input, output, sourceMap = false, sassOptions = {} } = options;

    return {
        name: NAME,

        buildStart() {
            if (!input) {
                this.error('options.input is required.');
            }
        },

        async generateBundle() {
            const inputPath = Path.resolve(process.cwd(), input);

            const result = await sass.compileAsync(inputPath, {
                sourceMap: !!sourceMap,
                sourceMapIncludeSources: !!sourceMap,
                ...sassOptions,
            });

            for (const url of result.loadedUrls) {
                if (url.protocol === 'file:') {
                    this.addWatchFile(fileURLToPath(url));
                }
            }

            const cssFileName =
                output ||
                Path.basename(inputPath).replace(/\.(scss|sass)$/i, '.css');

            this.info(`compiled ${input} -> ${cssFileName}`);

            let css = result.css;
            const inlineMap = sourceMap === 'inline';
            const externalMap = sourceMap && !inlineMap;

            if (externalMap) {
                const mapFileName = `${cssFileName}.map`;

                css = `${css}\n/*# sourceMappingURL=${Path.basename(mapFileName)} */`;

                this.emitFile({
                    type: 'asset',
                    fileName: mapFileName,
                    name: mapFileName,
                    source: JSON.stringify(result.sourceMap),
                    needsCodeReference: false,
                });
            }

            if (inlineMap) {
                const b64 = Buffer.from(
                    JSON.stringify(result.sourceMap)
                ).toString('base64');
                css = `${css}\n/*# sourceMappingURL=data:application/json;base64,${b64} */`;
            }

            this.emitFile({
                type: 'asset',
                fileName: cssFileName,
                name: cssFileName,
                source: css,
                needsCodeReference: false,
            });
        },
    };
}
