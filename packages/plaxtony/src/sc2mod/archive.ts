import * as fs from 'fs'
import * as glob from 'glob'
import * as path from 'path'
import * as trig from './trigger';
import { LocalizationFile } from './localization';

export function isSC2Archive(directory: string) {
    return /\.(SC2Mod|SC2Map|SC2Campaign)$/i.exec(path.basename(directory));
}

export function findSC2Archives(directory: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(path.join(directory, '**/*.+(SC2Mod|SC2Map|SC2Campaign)'), {nocase: true} , (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches.filter((value) => {
                    return fs.lstatSync(value).isDirectory();
                }));
            }
        });
    });
}

function findSC2File(directory: string, pattern: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(path.join(directory, '**/' + pattern), {nocase: true, nodir: true} , (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}

export class SC2Archive {
    trigLibs = new trig.LibraryContainer();
    // trigStrings = new Map<string, LocalizationFile>();
    trigStrings = new LocalizationFile();
    directory: string;

    public async openFromDirectory(directory: string) {
        this.directory = path.resolve(directory);

        // TODO: support Triggers
        for (const filename of await findSC2File(this.directory, '+(*.TriggerLib|*.SC2Lib)')) {
            this.trigLibs.addFromFile(filename);
        }

        // for (const filename of await findSC2File(this.directory, '*.sc2data/LocalizedData/TriggerStrings.txt')) {
        // }

        const filenames = await findSC2File(this.directory, 'enUS.sc2data/LocalizedData/TriggerStrings.txt');
        if (filenames.length) {
            this.trigStrings.readFromFile(filenames[0]);
        }
    }
}
