import * as fs from 'fs';
import { Element } from './trigger';

const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;

export class LocalizationFile extends Map<string,string> {
    readFromFile(filename: string): boolean {
        const text = fs.readFileSync(filename, 'utf8');

        return this.read(text);
    }

    read(content: string): boolean {
        // remove UTF8 BOM
        content = content.replace(/^\uFEFF/, '');

        let result: RegExpExecArray;
        while (result = fileRe.exec(content)) {
            this.set(result[1], result[5]);
        }

        return true;
    }
}

export class LocalizationTriggers {
    // protected entries: LocalizationFile;
    protected entries = new LocalizationFile();

    public merge(files: LocalizationFile[] | LocalizationFile) {
        if (files instanceof LocalizationFile) {
            files = [files];
        }
        for (const sf of files) {
            for (const [key, item] of sf) {
                this.entries.set(key, item);
            }
        }
    }

    public text(key: string, el?: Element) {
        if (el) {
            key = el.textKey(key);
        }
        return this.entries.get(key);
    }
}
