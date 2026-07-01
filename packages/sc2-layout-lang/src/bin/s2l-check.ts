import * as util from 'util';
import * as path from 'path';
import glob from 'fast-glob';
import { languageExt, DiagnosticReport, XMLDocument, DiagnosticCategory } from '../types.js';
import { createTextDocumentFromFs } from '../index/store.js';
import { buildStore, mockupProvider } from '../../test/helpers.js';
import { DiagnosticsProvider, formatDiagnosticTotal } from '../lsp/providers/diagnostics.js';
import * as s2 from '../index/s2mod.js';
import '../../test/bootstrap.js';

async function checkFiles(fpaths: string[]) {
    const store = buildStore();

    const wsArchives: s2.Archive[] = [];
    for (const wsFolder of fpaths) {
        for (const fsPath of (await s2.findArchiveDirectories(wsFolder))) {
            let name = path.basename(fsPath);
            wsArchives.push(new s2.Archive(name, fsPath));
        }
    }
    store.presetArchives(...wsArchives);

    fpaths = fpaths.map(p => path.resolve(p));
    let files: string[] = [];
    for (const fp of fpaths) {
        files = files.concat(await glob(path.join(fp, `**/*.${languageExt}`), {
            caseSensitiveMatch: false,
        }));
    }

    for (const item of files) {
        const tdoc = await createTextDocumentFromFs(item);
        store.updateDocument(tdoc.uri, tdoc.getText());
    }

    const pvdDiag = mockupProvider(DiagnosticsProvider, store);
    pvdDiag.analyzeFile(Array.from(store.documents.keys())[0]);
    console.log(formatDiagnosticTotal(pvdDiag.analyzeWorkspace()));
}

if (process.argv.length < 3) process.exit(1);

checkFiles(process.argv.slice(2));
