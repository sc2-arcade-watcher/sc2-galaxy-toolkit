"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;
class LocalizationFile extends Map {
    readFromFile(filename) {
        const text = fs.readFileSync(filename, 'utf8');
        return this.read(text);
    }
    read(content) {
        // remove UTF8 BOM
        content = content.replace(/^\uFEFF/, '');
        let result;
        while (result = fileRe.exec(content)) {
            this.set(result[1], result[5]);
        }
        return true;
    }
}
exports.LocalizationFile = LocalizationFile;
class LocalizationTriggers {
    constructor() {
        // protected entries: LocalizationFile;
        this.entries = new LocalizationFile();
    }
    merge(files) {
        if (files instanceof LocalizationFile) {
            files = [files];
        }
        for (const sf of files) {
            for (const [key, item] of sf) {
                this.entries.set(key, item);
            }
        }
    }
    text(key, el) {
        if (el) {
            key = el.textKey(key);
        }
        return this.entries.get(key);
    }
}
exports.LocalizationTriggers = LocalizationTriggers;
//# sourceMappingURL=localization.js.map