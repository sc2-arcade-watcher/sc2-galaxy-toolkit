import * as lsp from 'vscode-languageserver';
import { AbstractProvider, errGuard } from '../provider';
import { LayoutChecker } from '../../index/checker';
import { DiagnosticReport, XMLDocument, DiagnosticCategory } from '../../types';
import URI from 'vscode-uri';
import { logIt, logger } from '../../logger';

function translateDiagReport(rep: DiagnosticReport, xDoc: XMLDocument, source?: string): lsp.Diagnostic;
function translateDiagReport(rep: DiagnosticReport[], xDoc: XMLDocument, source?: string): lsp.Diagnostic[];
function translateDiagReport(rep: DiagnosticReport[] | DiagnosticReport, xDoc: XMLDocument, source?: string) {
    if (Array.isArray(rep)) {
        return rep.map(item => translateDiagReport(item, xDoc));
    }
    else {
        return lsp.Diagnostic.create(
            lsp.Range.create(
                xDoc.tdoc.positionAt(rep.start),
                xDoc.tdoc.positionAt(rep.end)
            ),
            rep.message,
            <any>rep.category,
            void 0,
            source
        );
    }
}

export interface DiagnosticFile extends lsp.Diagnostic {
    uri: string;
}

export interface DiagnosticWorkspaceSummary {
    diagnostics: DiagnosticFile[];
    filesProcessed: number;
    issuesTotal: {
        [DiagnosticCategory.Error]: number;
        [DiagnosticCategory.Warning]: number;
        [DiagnosticCategory.Message]: number;
        [DiagnosticCategory.Hint]: number;
    };
}

export function formatDiagnostic(dg: DiagnosticFile) {
    const so: string[] = [];
    so.push(`[${DiagnosticCategory[dg.severity].toUpperCase()}] ${dg.message}`);
    so.push(`\n    in ${URI.parse(dg.uri).fsPath}:${dg.range.start.line + 1}:${dg.range.start.character}`);
    return so.join('');
}

export function formatDiagnosticTotal(summary: DiagnosticWorkspaceSummary) {
    const so: string[] = [];

    so.push(summary.diagnostics.map(formatDiagnostic).join('\n\n'));
    if (summary.diagnostics.length) {
        so.push('\n\n');
    }

    so.push(`Processed ${summary.filesProcessed} files.\n\n`);
    for (const item of Object.keys(DiagnosticCategory).filter(v => typeof (DiagnosticCategory as any)[v] === 'number')) {
        so.push(`=`);
        so.push(summary.issuesTotal[DiagnosticCategory[item as keyof typeof DiagnosticCategory]].toString().padStart(6));
        so.push(` ${item}s\n`);
    }

    return so.join('');
}

export class DiagnosticsProvider extends AbstractProvider {
    protected checker: LayoutChecker;

    protected prepare() {
        this.checker = new LayoutChecker(this.store, this.store.index);
    }

    @errGuard()
    @logIt()
    public async analyzeFile(uri: string) {
        const xDoc = this.store.documents.get(uri);
        logger.debug('state', {uri: uri, version: xDoc.tdoc.version});

        const vdiag: lsp.Diagnostic[] = [];
        vdiag.push(...translateDiagReport(xDoc.parseDiagnostics, xDoc));
        if (this.store.s2ws.matchFileWorkspace(URI.parse(uri))) {
            vdiag.push(...translateDiagReport(this.checker.checkFile(xDoc), xDoc));
        }

        return vdiag;
    }

    @errGuard()
    @logIt()
    public analyzeWorkspace(): DiagnosticWorkspaceSummary {
        const dsum: DiagnosticWorkspaceSummary = {
            diagnostics: [],
            filesProcessed: 0,
            issuesTotal: {
                [DiagnosticCategory.Error]: 0,
                [DiagnosticCategory.Warning]: 0,
                [DiagnosticCategory.Message]: 0,
                [DiagnosticCategory.Hint]: 0,
            },
        };

        for (const sArchive of this.store.s2ws.archives) {
            if (sArchive.native) continue;

            for (const xDoc of this.store.getDocumentsInArchive(sArchive)) {
                const cDiags = [
                    ...translateDiagReport(xDoc.parseDiagnostics, xDoc),
                    ...translateDiagReport(this.checker.checkFile(xDoc), xDoc),
                ];
                cDiags.forEach(v => ++dsum.issuesTotal[v.severity]);
                dsum.diagnostics.push(...cDiags.map<DiagnosticFile>(v => {
                    return {
                        ...v,
                        uri: xDoc.tdoc.uri,
                    };
                }));
                ++dsum.filesProcessed;
            }
        }

        return dsum;
    }
}
