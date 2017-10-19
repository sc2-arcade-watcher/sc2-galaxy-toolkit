import * as gt from './types';

class Diagnostic implements gt.Diagnostic {
    file?: gt.SourceFile;
    messageText: string;
    code: number;
    category: gt.DiagnosticCategory;
    source?: string;

    start?: number;
    length?: number;

    constructor(file: gt.SourceFile, code: number, messageText: string, start: number, length: number) {
        this.file = file;
        this.code = code;
        this.messageText = messageText;
        this.start = start;
        this.length = length;
    }

    toString() {
        return `${this.file!.fileName} [${this.start}]: ${this.messageText}`.toString();
    }
}

export function formatStringFromArgs(text: string, args: { [index: number]: string; }, baseIndex?: number): string {
    baseIndex = baseIndex || 0;

    return text.replace(/{(\d+)}/g, (_match, index?) => args[+index + baseIndex!]);
}

export function createFileDiagnostic(file: gt.SourceFile, start: number, length: number, message: gt.DiagnosticMessage, ...args: (string | number)[]): gt.Diagnostic;
export function createFileDiagnostic(file: gt.SourceFile, start: number, length: number, message: gt.DiagnosticMessage): gt.Diagnostic {
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
