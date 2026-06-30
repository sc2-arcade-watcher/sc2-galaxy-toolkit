export interface ProjectConfig {
    archivePath?: string;
    dataPath?: string;
    fallbackDependency: string;
    s2mod: {
        sources: string[];
        overrides: Record<string, string>;
        extra: Record<string, string>;
    };
    dataCatalog: { enabled: boolean };
    metadata: {
        loadLevel: 'None' | 'Core' | 'Builtin' | 'Default';
        localization: string;
    };
    builtinMods: Record<string, boolean>;
    schema: {
        localPath?: string;
    };
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number | false;
}

export const defaultConfig: ProjectConfig = {
    archivePath: undefined,
    dataPath: undefined,
    fallbackDependency: 'mods/liberty.sc2mod',
    s2mod: {
        sources: [],
        overrides: {},
        extra: {},
    },
    dataCatalog: { enabled: true },
    metadata: {
        loadLevel: 'Default',
        localization: 'enUS',
    },
    builtinMods: {
        'core.sc2mod': true,
        'liberty.sc2mod': true,
        'swarm.sc2mod': true,
        'void.sc2mod': true,
        'balancemulti.sc2mod': true,
        'voidmulti.sc2mod': true,
        'swarmmulti.sc2mod': true,
        'libertymulti.sc2mod': true,
        'novastoryassets.sc2mod': true,
        'voidstory.sc2campaign': true,
        'swarmstory.sc2campaign': true,
        'libertystory.sc2campaign': true,
    },
    schema: {
        localPath: undefined,
    },
    documentUpdateDelay: 100,
    documentDiagnosticsDelay: 400,
};
