"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Diagnostic {
    constructor(file, code, messageText, start, length) {
        this.file = file;
        this.code = code;
        this.messageText = messageText;
        this.start = start;
        this.length = length;
    }
    toString() {
        return `${this.file.fileName} [${this.start}]: ${this.messageText}`.toString();
    }
}
function formatStringFromArgs(text, args, baseIndex) {
    baseIndex = baseIndex || 0;
    return text.replace(/{(\d+)}/g, (_match, index) => args[+index + baseIndex]);
}
exports.formatStringFromArgs = formatStringFromArgs;
function createFileDiagnostic(file, start, length, message) {
    // const end = start + length;
    // Debug.assert(start >= 0, "start must be non-negative, is " + start);
    // Debug.assert(length >= 0, "length must be non-negative, is " + length);
    // if (file) {
    //     Debug.assert(start <= file.text.length, `start must be within the bounds of the file. ${start} > ${file.text.length}`);
    //     Debug.assert(end <= file.text.length, `end must be the bounds of the file. ${end} > ${file.text.length}`);
    // }
    let text = message.message;
    if (arguments.length > 4) {
        text = formatStringFromArgs(text, arguments, 4);
    }
    return new Diagnostic(file, 0, text, start, length);
}
exports.createFileDiagnostic = createFileDiagnostic;
//# sourceMappingURL=diagnostics.js.map