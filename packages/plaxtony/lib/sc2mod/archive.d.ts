import * as trig from './trigger';
import { LocalizationFile } from './localization';
export declare function isSC2Archive(directory: string): RegExpExecArray;
export declare function findSC2Archives(directory: string): Promise<string[]>;
export declare class SC2Archive {
    trigLibs: trig.LibraryContainer;
    trigStrings: LocalizationFile;
    directory: string;
    openFromDirectory(directory: string): Promise<void>;
}
