import * as lsp from 'vscode-languageserver';
import * as gt from '../compiler/types';
import { AbstractProvider } from './provider';
import { Diagnostic, DiagnosticCategory } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { unbindSourceFile } from '../compiler/binder';
import { getLineAndCharacterOfPosition } from './utils';
import { logger } from '../common';
import URI from 'vscode-uri';
import { QualifiedSourceFile } from './store';

export function formatDiagnosticTotal(summary: DiagnosticWorkspaceSummary) {
    const so: string[] = [];

    for (const [uri, dlist] of summary.diagnostics) {
        const qs = summary.sourceFiles.get(uri);
        so.push(`"${qs.s2meta.docName}" ${uri}\n`);
        for (const dg of dlist) {
            so.push(`\n[${DiagnosticCategory[dg.category].toUpperCase()}] ${dg.messageText}`);
            so.push(`\n    in ${URI.parse(uri).fsPath}:${dg.line + 1}:${dg.col}\n\n`);
        }
    }

    so.push('\n\n');

    so.push(`Processed ${summary.filesProcessed} files.\n\n`);
    for (const item of Object.keys(DiagnosticCategory).filter(v => typeof (DiagnosticCategory as any)[v] === 'number')) {
        so.push('=');
        so.push(summary.issuesTotal[DiagnosticCategory[item as keyof typeof DiagnosticCategory]].toString().padStart(6));
        so.push(` ${item}s\n`);
    }

    return so.join('');
}

export interface DiagnosticWorkspaceSummary {
    diagnostics: Map<string, Diagnostic[]>;
    sourceFiles: Map<string, QualifiedSourceFile>;
    filesProcessed: number;
    issuesTotal: {
        [DiagnosticCategory.Error]: number;
        [DiagnosticCategory.Warning]: number;
        [DiagnosticCategory.Message]: number;
        [DiagnosticCategory.Hint]: number;
    };
}

export type DiagnosticsCallback = (a: string) => void;

export class DiagnosticsProvider extends AbstractProvider {
    private reporter?: DiagnosticsCallback;

    private translateDiagnostics(sourceFile: gt.SourceFile, origDiagnostics: gt.Diagnostic[], source: string): lsp.Diagnostic[] {
        let lspDiagnostics: lsp.Diagnostic[] = [];

        for (let dg of origDiagnostics) {
            const tmp = <lsp.Diagnostic>{
                severity: dg.category,
                range: {
                    start: getLineAndCharacterOfPosition(sourceFile, dg.start),
                    end: getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
                },
                message: dg.messageText,
                source,
            };
            if (tmp.tags) {
                tmp.tags = dg.tags;
            }
            lspDiagnostics.push(tmp);
        }

        return lspDiagnostics;
    }

    public subscribe(uri: string) {
    }

    public checkFile(documentUri: string) {
        const checker = new TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        unbindSourceFile(sourceFile, this.store);
        sourceFile.additionalSyntacticDiagnostics = checker.checkSourceFile(sourceFile, true);
    }

    public provideDiagnostics(uri: string): lsp.Diagnostic[] {
        const sourceFile = this.store.documents.get(uri);

        let parseDiag = sourceFile.parseDiagnostics;
        let checkerDiag = sourceFile.additionalSyntacticDiagnostics;

        logger.info(`${uri} - ${parseDiag.length} - ${checkerDiag.length}`);

        if (parseDiag.length > 100) parseDiag = parseDiag.slice(0, 100);
        if (checkerDiag.length > 100) checkerDiag = checkerDiag.slice(0, 100);

        return [].concat(
            this.translateDiagnostics(sourceFile, parseDiag, 'parser'),
            this.translateDiagnostics(sourceFile, checkerDiag, 'typecheck')
        );
    }

    public checkFileRecursively(documentUri: string) {
        const checker = new TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        const result = checker.checkSourceFileRecursively(sourceFile);

        const dsum: DiagnosticWorkspaceSummary = {
            diagnostics: result.diagnostics,
            sourceFiles: result.sourceFiles,
            filesProcessed: result.sourceFiles.size,
            issuesTotal: {
                [DiagnosticCategory.Error]: 0,
                [DiagnosticCategory.Warning]: 0,
                [DiagnosticCategory.Message]: 0,
                [DiagnosticCategory.Hint]: 0,
            },
        };

        for (const itDg of result.diagnostics.values()) {
            itDg.forEach(v => ++dsum.issuesTotal[v.category])
        }

        return dsum;
    }
}
