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
    let text = message.message;
    if (arguments.length > 4) {
        text = formatStringFromArgs(text, arguments, 4);
    }
    return new Diagnostic(file, 0, text, start, length);
}
exports.createFileDiagnostic = createFileDiagnostic;
//# sourceMappingURL=diagnostics.js.map