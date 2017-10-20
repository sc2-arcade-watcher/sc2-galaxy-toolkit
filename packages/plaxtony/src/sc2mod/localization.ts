import * as fs from 'fs';

const fileRe = /^((\w+)\/(\w+)\/(\w+))=(.+)$/gmu;

export class LocalizationFile extends Map<string,string> {
    readFromFile(filename: string): boolean {
        let text = fs.readFileSync(filename, 'utf8');
        text.charCodeAt

        // remove UTF8 BOM
        text = text.replace(/^\uFEFF/, '');

        let result: RegExpExecArray;
        while (result = fileRe.exec(text)) {
            this.set(result[1], result[5]);
        }

        return true;
    }
}
