import * as fs from 'fs';
import { Element } from './trigger';

// const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;
const fileRe = /^\s*([^=]+)=(.+)$/gmu;

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
            // this.set(result[1], result[5]);
            this.set(result[1], result[2]);
        }

        return true;
    }
}

export class LocalizationTextStore {
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

    public text(key: string) {
        return this.entries.get(key);
    }
}

export class LocalizationTriggers extends LocalizationTextStore {
    public elementName(key: string, el?: Element, fallbackToKey = false) {
        if (el) {
            key = el.textKey(key);
        }
        const r = this.entries.get(key);
        if (r) {
            return r;
        }
        if (fallbackToKey) {
            return key;
        }
    }
}
