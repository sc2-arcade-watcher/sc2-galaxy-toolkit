import * as lsp from 'vscode-languageserver';
import { AbstractProvider, errGuard } from '../provider';
import { LayoutChecker } from '../../index/checker';
import { DiagnosticReport } from '../../types';
import URI from 'vscode-uri';
import { logIt, logger } from '../../logger';

export class DiagnosticsProvider extends AbstractProvider {
    protected checker: LayoutChecker;

    protected prepare() {
        this.checker = new LayoutChecker(this.store, this.store.index);
    }

    @errGuard()
    @logIt()
    public async provide(uri: string) {
        const xDoc = this.store.documents.get(uri);
        logger.debug('state', {uri: uri, version: xDoc.tdoc.version});

        const vdiag: lsp.Diagnostic[] = [];

        function processReports(reports: DiagnosticReport[], source?: string) {
            for (const item of reports) {
                const tmpPos = [xDoc.tdoc.positionAt(item.start) , xDoc.tdoc.positionAt(item.end)];
                const tmpDiag = lsp.Diagnostic.create(
                    lsp.Range.create(
                        lsp.Position.create(tmpPos[0].line, tmpPos[0].character),
                        lsp.Position.create(tmpPos[1].line, tmpPos[1].character)
                    ),
                    item.message,
                    <any>item.category,
                );
                tmpDiag.source = source;
                vdiag.push(tmpDiag);
            }
        }

        processReports(xDoc.parseDiagnostics);

        if (this.store.s2ws.matchFileWorkspace(URI.parse(uri))) {
            processReports(this.checker.checkFile(xDoc));
        }

        return vdiag;
    }
}
