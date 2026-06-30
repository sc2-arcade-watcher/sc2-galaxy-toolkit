import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'path';
import { URI } from 'vscode-uri';
import { SC2Archive, SC2Workspace as SC2WorkspaceBase, Component } from 'sc2-mod';
import * as trig from './trigger.js';
import * as cat from './datacatalog.js';
import * as loc from './localization.js';
import { logger, logIt } from 'sc2-mod';

export { SC2Archive, Component, isSC2Archive, findSC2ArchiveDirectories, resolveArchiveDirectory, resolveArchiveDependencyList, logger, logIt } from 'sc2-mod';
export type { S2QualifiedFile, S2FileNs, ArchiveLink, BuiltinDepName, LogItOptions } from 'sc2-mod';
export { BuiltinDeps, S2ArchiveNsNameKind, S2ArchiveNsTypeKind } from 'sc2-mod';

export class TriggerComponent extends Component {
    protected store = new trig.TriggerStore();

    @logIt()
    public async loadData() {
        const trigReader = new trig.XMLReader(this.store);

        for (const archive of this.workspace.metadataArchives) {
            for (const filename of await archive.findFiles('**/*.{TriggerLib,SC2Lib}')) {
                logger.debug(`:: ${archive.name}/${filename}`);
                this.store.addLibrary(await trigReader.loadLibrary(await archive.readFile(filename)));
            }
            if (await archive.hasFile('Triggers')) {
                logger.debug(`:: ${archive.name}/Triggers`);
                await trigReader.load(await archive.readFile('Triggers'), this.workspace.rootArchive !== archive);
            }
        }

        return true;
    }

    public getStore() {
        return this.store;
    }
}

export class CatalogComponent extends Component {
    protected store = new cat.CatalogStore();

    @logIt()
    public async loadData() {
        for await (const [archive, filename] of this.workspace.findFiles('**/GameData/**/*.xml')) {
            logger.debug(`:: ${archive.name}/${filename}`);
            const doc = TextDocument.create(
                URI.file(path.join(archive.directory, filename)).toString(),
                'xml',
                0,
                await archive.readFile(filename)
            );
            this.store.update(doc, archive);
        }
        return true;
    }

    public getStore() {
        return this.store;
    }
}

export class LocalizationComponent extends Component {
    lang = 'enUS';
    triggers = new loc.LocalizationTriggers();
    strings = new Map<string, loc.LocalizationTextStore>();

    private async loadStrings(name: string) {
        const textStore = new loc.LocalizationTextStore();
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles('**/' + this.lang + '.SC2Data/LocalizedData/' + name + 'Strings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                textStore.merge(locFile);
            }
        }
        this.strings.set(name, textStore);
    }

    @logIt()
    public async loadData() {
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles('**/' + this.lang + '.SC2Data/LocalizedData/TriggerStrings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                this.triggers.merge(locFile);
            }
        }

        await this.loadStrings('Game');
        await this.loadStrings('Object');

        return true;
    }
}

export class SC2Workspace extends SC2WorkspaceBase {
    trigComponent: TriggerComponent = new TriggerComponent(this);
    locComponent: LocalizationComponent = new LocalizationComponent(this);
    catalogComponent: CatalogComponent = new CatalogComponent(this);

    static async documentFromFile(archive: SC2Archive, filename: string, languageId?: string) {
        if (!languageId) {
            languageId = path.extname(filename).split('.').pop();
        }
        return TextDocument.create(
            URI.file(path.join(archive.directory, filename)).toString(),
            languageId,
            0,
            await archive.readFile(filename)
        );
    }
}

export async function openArchiveWorkspace(archive: SC2Archive, sources: string[], overrides: Map<string,string> = null, extra: Map<string,string> = null) {
    const { resolveArchiveDependencyList } = await import('sc2-mod');
    const dependencyArchives: SC2Archive[] = [];
    const result = await resolveArchiveDependencyList(archive, sources, {
        overrides,
    });

    if (result.unresolvedNames.length > 0) {
        const util = await import('util');
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
