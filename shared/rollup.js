import typescript from '@rollup/plugin-typescript';
import { execSync } from 'node:child_process';
import { dts } from 'rollup-plugin-dts';

/**
 * @typedef Package
 * @property {string} name
 * @property {string} version
 * @property {string} homepage
 * @property {string} license
 * @property {string} types
 * @property {string} main
 * @property {string} module
 * @property {Record<string,string>} dependencies
 */

/**
 * @typedef Version
 * @property {string} version
 * @property {string} branch
 * @property {string} tag
 * @property {string} commit
 * @property {boolean} dev
 * @property {boolean} dirty
 * @property {string} text
 * @property {string} builtTime
 */

/**
 * @param {Package} pkg
 * @returns {Version}
 */
function version(pkg) {
    const dev = process.env.NODE_ENV !== 'production';
    const exec = (/** @type {string} */ cmd) => {
        try {
            return execSync(cmd, { stdio: 'pipe' }).toString().trim();
        } catch {
            return '';
        }
    };
    const r = {
        version: pkg.version,
        branch: exec('git branch --show-current'),
        tag: exec('git describe --tags --exact-match HEAD'),
        commit: exec('git rev-parse --verify HEAD'),
        dirty: exec('git status --short').length !== 0,
        dev: dev,
        text: '',
        builtTime: new Date().toISOString(),
    };
    r.text = `v${r.version} - ${r.tag ? `tag:${r.tag}` : r.branch}@${r.commit.slice(0, 8)}`;
    if (r.dirty) r.text += '*';
    if (dev) r.text += '(dev)';
    console.log(r);
    return r;
}

/**
 * @param {Version} ver
 * @param {Package} pkg
 * @param {string} type
 * @returns
 */
function banner(pkg, ver, type) {
    return `/*!
 * ${type} of ${pkg.name}
 * ${pkg.homepage}
 * Generated at ${ver.builtTime}
 * Version: ${ver.text}
 * Copyright (C) 2026 AUIOC.ORG
 * Copyright (C) 2022-2026 PCC-Studio
 * Licensed under ${pkg.license}
 */`;
}

/**
 * @param {Package} pkg
 */
export function createConfig(pkg) {
    const ver = version(pkg);
    /** @type {import('rollup').RollupOptions[]} */
    const options = [
        {
            input: 'src/index.ts',
            output: [
                {
                    file: pkg.types,
                    format: 'es',
                    sourcemap: ver.dev,
                    banner: banner(pkg, ver, 'Type definitions'),
                },
            ],
            plugins: [dts()],
        },
        {
            input: 'src/index.ts',
            external: [/^node:/, ...Object.keys(pkg.dependencies || {})],
            output: [
                {
                    format: 'cjs',
                    file: pkg.main,
                    exports: 'named',
                    sourcemap: true,
                    banner: banner(pkg, ver, 'Package bundle (CJS)'),
                },
                {
                    format: 'es',
                    file: pkg.module,
                    sourcemap: true,
                    banner: banner(pkg, ver, 'Package bundle (ESM)'),
                },
            ],
            plugins: [typescript()],
        },
    ];
    return options;
}
