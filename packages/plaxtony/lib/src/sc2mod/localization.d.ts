import { Element } from './trigger';
export declare class LocalizationFile extends Map<string, string> {
    readFromFile(filename: string): boolean;
    read(content: string): boolean;
}
export declare class LocalizationTextStore {
    protected entries: LocalizationFile;
    merge(files: LocalizationFile[] | LocalizationFile): void;
    text(key: string): string;
}
export declare class LocalizationTriggers extends LocalizationTextStore {
    elementName(key: string, el?: Element): string;
}
