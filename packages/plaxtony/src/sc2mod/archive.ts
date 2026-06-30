import { SC2Workspace as SC2WorkspaceBase, SC2Archive } from 'sc2-mod';
import { TriggerComponent } from 'sc2-trigger';
import { CatalogComponent } from 'sc2-data';
import { LocalizationComponent } from 'sc2-text';

export { SC2Archive, Component, isSC2Archive, findSC2ArchiveDirectories, resolveArchiveDirectory, resolveArchiveDependencyList, openArchiveWorkspace as openArchiveWorkspaceBase, logger, logIt } from 'sc2-mod';
export type { S2QualifiedFile, S2FileNs, ArchiveLink, BuiltinDepName, LogItOptions } from 'sc2-mod';
export { BuiltinDeps, S2ArchiveNsNameKind, S2ArchiveNsTypeKind } from 'sc2-mod';
export { TriggerComponent } from 'sc2-trigger';
export { CatalogComponent } from 'sc2-data';
export { LocalizationComponent } from 'sc2-text';

export class SC2Workspace extends SC2WorkspaceBase {
    trigComponent = new TriggerComponent(this);
    locComponent = new LocalizationComponent(this);
    catalogComponent = new CatalogComponent(this);
}

export async function openArchiveWorkspace(archive: SC2Archive, sources: string[], overrides: Map<string,string> = null, extra: Map<string,string> = null) {
    const { resolveArchiveDependencyList } = await import('sc2-mod');
    const util = await import('util');
    const dependencyArchives: SC2Archive[] = [];
    const result = await resolveArchiveDependencyList(archive, sources, {
        overrides,
    });

    if (result.unresolvedNames.length > 0) {
        throw new Error(`couldn\'t resolve ${util.inspect(result.unresolvedNames)}\nSources: ${util.inspect(sources)}\nOverrides: ${util.inspect(overrides)}`);
    }

    for (const link of result.list) {
        dependencyArchives.push(new SC2Archive(link.name, link.src));
    }

    if (extra) {
        for (const [name, src] of extra) {
            dependencyArchives.push(new SC2Archive(name, src));
        }
    }

    return new SC2Workspace(archive, dependencyArchives);
}
