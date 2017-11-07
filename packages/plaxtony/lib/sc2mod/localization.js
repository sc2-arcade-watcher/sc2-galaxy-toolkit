"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;
class LocalizationFile extends Map {
    readFromFile(filename) {
        let text = fs.readFileSync(filename, 'utf8');
        text.charCodeAt;
        // remove UTF8 BOM
        text = text.replace(/^\uFEFF/, '');
        let result;
        while (result = fileRe.exec(text)) {
            this.set(result[1], result[5]);
        }
        return true;
    }
}
exports.LocalizationFile = LocalizationFile;
//# sourceMappingURL=localization.js.map