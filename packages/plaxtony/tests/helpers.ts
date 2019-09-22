import { SourceFile, Diagnostic } from './../src/compiler/types';
import { Parser } from '../src/compiler/parser';
import { TextDocument } from 'vscode-languageserver';
import { Store, S2WorkspaceWatcher, createTextDocumentFromFs, openSourceFilesInLocation } from '../src/service/store';
import { SC2Workspace } from '../src/sc2mod/archive';
import * as path from 'path';

const fixturesPath = 'tests/fixtures';

export function fixtureFilePath(...filepath: string[]) {
    return path.join(fixturesPath, ...filepath);
}

export function mockupTextDocument(...filepath: string[]): TextDocument {
    return createTextDocumentFromFs(fixtureFilePath(...filepath));
}

export function mockupSourceFile(...filepath: string[]): SourceFile {
    const parser = new Parser();
    const completeFilePath = fixtureFilePath(...filepath);
    const document = createTextDocumentFromFs(completeFilePath);
    return parser.parseFile(path.basename(completeFilePath), document.getText());
}

export function mockupStoreDocument(...filepath: string[]): [Store, SourceFile] {
    const store = new Store();
    const document = createTextDocumentFromFs(fixtureFilePath(...filepath));
    store.updateDocument(document);
    return [store, store.documents.get(document.uri)];
}

export function mockupStore(...documents: TextDocument[]) {
    const store = new Store();
    for (const doc of documents) {
        store.updateDocument(doc);
    }
    return store;
}

export async function mockupStoreFromDirectory(directory: string) {
    const store = new Store();
    store.rootPath = directory;
    for await (const doc of openSourceFilesInLocation(directory)) {
        store.updateDocument(doc);
    }
    return store;
}

export async function mockupStoreFromS2Workspace(directory: string, modSources: string[]) {
    const store = new Store();
    const ws = new S2WorkspaceWatcher(directory, modSources);
    const workspaces: SC2Workspace[] = [];
    ws.onDidOpen((ev) => {
        store.updateDocument(ev.document);
    });
    ws.onDidOpenS2Archive((ev) => {
        workspaces.push(ev.workspace);
    });
    await ws.watch();
    for (const ws of workspaces) {
        await store.updateS2Workspace(ws);
        await store.rebuildS2Metadata('enUS');
    }
    return store;
}

export function mapStoreFilesByBasename(store: Store) {
    const m = new Map<string, SourceFile>();
    for (const [fullname, sourceFile] of store.documents.entries()) {
        m.set(path.basename(fullname), sourceFile);
    }
    return m;
}

function printDiagnostics(diagnostics: Diagnostic[]): string {
    const r = <string[]>[];
    for (const diag of diagnostics) {
        console.log(diag);

        r.push(diag.toString());
    }
    return r.join('\n');
}
