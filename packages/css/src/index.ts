import CleanCSS from 'clean-css';
import fs from 'node:fs';
import { default as Path } from 'node:path';
import type { EmittedFile, Plugin } from 'rollup';

const NAME = 'css';

interface BaseOptions {
    /**
     * Output file name
     * @default 'bundle.css'
     */
    output?: string;
    minify?: boolean | CleanCSS.OptionsOutput;
}

// TODO sourcemap

export type Options = BaseOptions &
    (
        | {
              /**
               * Raw CSS string
               */
              source: string;
              file?: never;
          }
        | {
              /**
               * Path of `.css` file
               */
              file: string;
              source?: never;
          }
    );

export default function addCssToBundle(options: Options): Plugin {
    const { output = 'bundle.css', minify = false } = options;

    let css = '';

    return {
        name: NAME,

        buildStart() {
            if (options.file) {
                try {
                    const path = Path.resolve(process.cwd(), options.file);
                    css = fs.readFileSync(path, 'utf-8');
                } catch (error) {
                    this.error(String(error));
                }
            } else if (options.source) {
                css = options.source;
            }
        },

        generateBundle(outputOptions, bundle) {
            if (!css) {
                return;
            }

            if (minify) {
                const minifyOptions = typeof minify === 'object' ? minify : {};

                const cleaner = new CleanCSS(minifyOptions);
                const result = cleaner.minify(css);

                if (result.errors && result.errors.length > 0) {
                    this.error(`${result.errors.join('\n')}`);
                    return;
                }

                if (result.warnings && result.warnings.length > 0) {
                    result.warnings.forEach((warning) => this.warn(warning));
                }

                css = result.styles;
            }

            const asset: EmittedFile = {
                type: 'asset',
                fileName: output,
                source: css,
                name: output,
                needsCodeReference: false,
            };

            this.emitFile(asset);
        },
    };
}
