import type { SC2Archive } from './archive.js';

export enum S2ArchiveNsNameKind {
    base,
    enus,
}

export enum S2ArchiveNsTypeKind {
    sc2assets,
    sc2data,
}

export interface S2FileNs {
    name: keyof typeof S2ArchiveNsNameKind;
    type: keyof typeof S2ArchiveNsTypeKind;
}

export interface S2QualifiedFile {
    fsPath: string;
    relativePath: string;
    archiveRelpath: string;
    namespace?: S2FileNs;
    archive?: SC2Archive;
    priority: number;
}

export interface ArchiveLink {
    name: string;
    src: string;
}

export enum BuiltinDeps {
    'mods/core.sc2mod',
    'mods/glue.sc2mod',
    'mods/liberty.sc2mod',
    'mods/swarm.sc2mod',
    'mods/void.sc2mod',
    'mods/libertymulti.sc2mod',
    'mods/swarmmulti.sc2mod',
    'mods/voidmulti.sc2mod',
    'mods/balancemulti.sc2mod',
    'mods/starcoop/starcoop.sc2mod',
    'mods/war3.sc2mod',
    'mods/novastoryassets.sc2mod',
    'campaigns/liberty.sc2campaign',
    'campaigns/swarm.sc2campaign',
    'campaigns/void.sc2campaign',
    'campaigns/libertystory.sc2campaign',
    'campaigns/swarmstory.sc2campaign',
    'campaigns/voidstory.sc2campaign',
}

export type BuiltinDepName = keyof typeof BuiltinDeps;
