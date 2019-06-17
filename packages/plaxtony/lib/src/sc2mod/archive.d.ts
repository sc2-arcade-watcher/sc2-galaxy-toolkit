import * as trig from './trigger';
import * as cat from './datacatalog';
import * as loc from './localization';
export declare function isSC2Archive(directory: string): RegExpExecArray;
export declare function findSC2ArchiveDirectories(directory: string): Promise<string[]>;
export declare abstract class Component {
    protected workspace: SC2Workspace;
    protected waitPromise: Promise<boolean>;
    protected waitQueue: (ready: boolean) => void;
    protected ready: boolean;
    constructor(workspace: SC2Workspace);
    load(): Promise<boolean>;
    abstract loadData(): Promise<boolean>;
    isReady(): boolean;
    sync(): Promise<boolean>;
}
export declare class TriggerComponent extends Component {
    protected store: trig.TriggerStore;
    loadData(): Promise<boolean>;
    getStore(): trig.TriggerStore;
}
export declare class CatalogComponent extends Component {
    protected store: cat.GameCatalogStore;
    loadData(): Promise<boolean>;
    getStore(): cat.GameCatalogStore;
}
export declare class LocalizationComponent extends Component {
    lang: string;
    triggers: loc.LocalizationTriggers;
    strings: Map<string, loc.LocalizationTextStore>;
    private loadStrings(name);
    loadData(): Promise<boolean>;
}
export interface ArchiveLink {
    name: string;
    src: string;
}
export declare function resolveArchiveDirectory(name: string, sources: string[]): Promise<string>;
export declare function resolveArchiveDependencyList(rootArchive: SC2Archive, sources: string[], overrides?: Map<string, string>): Promise<{
    list: ArchiveLink[];
    unresolvedNames: string[];
}>;
export declare function openArchiveWorkspace(archive: SC2Archive, sources: string[], overrides?: Map<string, string>, extra?: Map<string, string>): Promise<SC2Workspace>;
export declare class SC2Archive {
    name: string;
    directory: string;
    constructor(name: string, directory: string);
    findFiles(pattern: string): Promise<string[]>;
    hasFile(filename: string): Promise<boolean>;
    readFile(filename: string): Promise<string>;
    getDependencyList(): Promise<string[]>;
}
export declare class SC2Workspace {
    rootArchive?: SC2Archive;
    allArchives: SC2Archive[];
    dependencies: SC2Archive[];
    trigComponent: TriggerComponent;
    locComponent: LocalizationComponent;
    catalogComponent: CatalogComponent;
    constructor(rootArchive?: SC2Archive, dependencies?: SC2Archive[]);
    loadComponents(): Promise<void>;
}
