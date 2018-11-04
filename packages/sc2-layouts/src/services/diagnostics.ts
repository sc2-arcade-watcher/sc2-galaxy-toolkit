import * as vs from 'vscode';
import { AbstractProvider, svcRequest } from './provider';
import { LayoutChecker } from '../index/checker';
import { DiagnosticReport } from '../types';

export class DiagnosticsProvider extends AbstractProvider {
    protected checker: LayoutChecker;

    protected prepare() {
        this.checker = new LayoutChecker(this.store, this.store.index);
    }

    @svcRequest(false)
    public async provideDiagnostics(uri: string) {
        const xDoc = this.store.documents.get(uri);
        this.console.log('state', {uri: uri, version: xDoc.tdoc.version});
        const validationReports = this.checker.checkFile(xDoc);

        const vdiag: vs.Diagnostic[] = [];

        function processReports(reports: DiagnosticReport[], source: string) {
            for (const item of reports) {
                const tmpPos = [xDoc.tdoc.positionAt(item.start) , xDoc.tdoc.positionAt(item.end)];
                const tmpDiag = new vs.Diagnostic(
                    new vs.Range(
                        new vs.Position(tmpPos[0].line, tmpPos[0].character),
                        new vs.Position(tmpPos[1].line, tmpPos[1].character)
                    ),
                    item.message,
                    <any>item.category,
                );
                tmpDiag.source = source;
                vdiag.push(tmpDiag);
            }
        }

        processReports(xDoc.parseDiagnostics, 'parse');
        processReports(validationReports, 'valid');

        return vdiag;
    }
}
