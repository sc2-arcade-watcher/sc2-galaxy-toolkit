"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
// const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;
const fileRe = /^\s*([^=]+)=(.+)$/gmu;
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
            // this.set(result[1], result[5]);
            this.set(result[1], result[2]);
        }
        return true;
    }
}
exports.LocalizationFile = LocalizationFile;
class LocalizationTextStore {
    constructor() {
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
    text(key) {
        return this.entries.get(key);
    }
}
exports.LocalizationTextStore = LocalizationTextStore;
class LocalizationTriggers extends LocalizationTextStore {
    elementName(key, el) {
        if (el) {
            key = el.textKey(key);
        }
        return this.entries.get(key);
    }
}
exports.LocalizationTriggers = LocalizationTriggers;
//# sourceMappingURL=localization.js.map