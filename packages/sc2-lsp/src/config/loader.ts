import * as fs from 'node:fs';
import * as path from 'path';
import { defaultConfig, type ProjectConfig } from './types.js';

export const CONFIG_FILENAME = 'sc2project.json';

export function findConfigFile(startDir: string): string | undefined {
    let dir = path.resolve(startDir);
    while (true) {
        const candidate = path.join(dir, CONFIG_FILENAME);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
}

export function loadConfig(configPath?: string): ProjectConfig {
    if (!configPath) {
        return { ...defaultConfig };
    }

    try {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return mergeConfig(defaultConfig, raw);
    }
    catch {
        return { ...defaultConfig };
    }
}

function mergeConfig(defaults: ProjectConfig, overrides: Partial<ProjectConfig>): ProjectConfig {
    return {
        ...defaults,
        ...overrides,
        s2mod: { ...defaults.s2mod, ...overrides.s2mod },
        dataCatalog: { ...defaults.dataCatalog, ...overrides.dataCatalog },
        metadata: { ...defaults.metadata, ...overrides.metadata },
        schema: { ...defaults.schema, ...overrides.schema },
    };
}
