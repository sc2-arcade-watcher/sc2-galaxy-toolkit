import * as fs from 'node:fs';

const fileRe = /^\s*([^=]+)=(.+)$/gmu;

export class LocalizationFile extends Map<string,string> {
    readFromFile(filename: string): boolean {
        const text = fs.readFileSync(filename, 'utf8');
        return this.read(text);
    }

    read(content: string): boolean {
        content = content.replace(/^﻿/, '');

        let result: RegExpExecArray;
        while (result = fileRe.exec(content)) {
            if (result[1].startsWith('//')) continue;
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

export interface TextKeyProvider {
    textKey(kind: string): string;
}

export class LocalizationTriggers extends LocalizationTextStore {
    public elementName(key: string, el?: TextKeyProvider, fallbackToKey = false) {
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
