import { createConfig } from '../../shared/rollup.js';

import pkg from './package.json' with { type: 'json' };

export default [...createConfig(pkg)];
