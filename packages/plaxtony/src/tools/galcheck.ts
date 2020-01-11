import * as path from 'path';
import { Store, createTextDocumentFromFs } from '../service/store';
import { openArchiveWorkspace, SC2Archive } from '../sc2mod/archive';
import { logger } from '../common';
import { createProvider } from '../service/provider';
import { DiagnosticsProvider, formatDiagnosticTotal } from '../service/diagnostics';
import URI from 'vscode-uri';

(async function () {
    const store = new Store();
    const rootArchive = new SC2Archive(path.basename(process.argv[3]), path.join(process.argv[3]));

    const s2work = await openArchiveWorkspace(rootArchive, [process.argv[2]]);
    await store.updateS2Workspace(s2work);

    for (const mod of s2work.allArchives) {
        for (const filepath of await mod.findFiles('**/*.galaxy')) {
            logger.verbose(` :: ${filepath}`);
            store.updateDocument(createTextDocumentFromFs(path.join(mod.directory, filepath)));
        }
    }

    await store.rebuildS2Metadata({ loadLevel: 'None', localization: 'enUS' });

    const diagProvider = createProvider(DiagnosticsProvider, store);
    console.log(formatDiagnosticTotal(diagProvider.checkFileRecursively(
        URI.file(path.resolve(process.argv[4])).toString()
    )))
})();
