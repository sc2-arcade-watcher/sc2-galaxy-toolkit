import * as Types from '../compiler/types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from '../compiler/types';
import { Parser } from '../compiler/parser';
import { bindSourceFile } from '../compiler/binder';
import { TextDocument } from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';

// function indexSourceFile(sourceFile: SourceFile) {
//     function registerDefinition(node: Types.NamedDeclaration) {
//         console.log(node.name);
//     }

//     function visitNode(node: Node) {
//         if (node.kind === SyntaxKind.VariableDeclaration) {
//             registerDefinition(<Types.NamedDeclaration>node);
//         }

//         forEachChild(node, child => visitNode(child));
//     }

//     visitNode(sourceFile);
// }

export function createTextDocument(uri: string, text: string): TextDocument {
    return <TextDocument>{
        uri: uri,
        languageId: 'galaxy',
        version: 1,
        getText: () => text,
    };
}

export function createTextDocumentFromFs(filepath: string): TextDocument {
    filepath = path.resolve(filepath);
    return createTextDocument(`file://${filepath}`, fs.readFileSync(filepath, 'utf8'));
}

export class IndexedDocument {
    textDocument: TextDocument;
    sourceNode: SourceFile;
}

export class Store {
    // private documents: Store;
    public documents: Map<string, SourceFile>;

    constructor() {
        this.documents = new Map<string, SourceFile>();
    }

    public initialize() {
    }

    public updateDocument(document: TextDocument) {
        let p = new Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }
}
