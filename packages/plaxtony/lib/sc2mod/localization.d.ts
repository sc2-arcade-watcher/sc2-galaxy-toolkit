import { Element } from './trigger';
export declare class LocalizationFile extends Map<string, string> {
    readFromFile(filename: string): boolean;
    read(content: string): boolean;
}
export declare class LocalizationTriggers {
    protected entries: LocalizationFile;
    merge(files: LocalizationFile[] | LocalizationFile): void;
    text(key: string, el?: Element): string;
}
