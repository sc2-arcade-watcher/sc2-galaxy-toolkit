import * as util from 'util';
import * as path from 'path';
import * as glob from 'glob';
import { languageExt, DiagnosticReport, XMLDocument, DiagnosticCategory } from '../types';
import { createTextDocumentFromFs } from '../index/store';
import { buildStore } from '../../test/helpers';
import { LayoutChecker } from '../index/checker';
require('../../test/bootstrap');

async function checkFiles(fpath: string) {
    const store = buildStore();

    const files = glob.sync(path.join(fpath, `**/*.${languageExt}`), {
        nocase: true,
    });

    for (const item of files) {
        console.log(`Indexing: ${item}`);
        const tdoc = await createTextDocumentFromFs(item);
        store.updateDocument(tdoc.uri, tdoc.getText());
    }

    function printReports(xDoc: XMLDocument, reports: DiagnosticReport[], source: string) {
        for (const item of reports) {
            const tPos = xDoc.tdoc.positionAt(item.start);
            console.log(` [${tPos.line + 1}:${tPos.character}] - ${DiagnosticCategory[item.category]} (${source}) ${item.message}`);
        }
    }

    const checker = new LayoutChecker(store, store.index);
    let total = 0;
    for (const xDoc of store.documents.values()) {
        console.log(xDoc.tdoc.uri);
        const checkerReports = checker.checkFile(xDoc);
        printReports(xDoc, xDoc.parseDiagnostics, 'parser');
        printReports(xDoc, checkerReports, 'checker');
        total += xDoc.parseDiagnostics.length + checkerReports.length;
    }
    console.log(`Total: ${total}`);
}

if (!process.argv[2]) process.exit(1);

checkFiles(process.argv[2]);
