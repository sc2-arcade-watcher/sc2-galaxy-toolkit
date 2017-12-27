import { AbstractProvider } from './provider';
import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { forEachChild } from '../compiler/utils';
import { getPositionOfLineAndCharacter, getAdjacentIdentfier, getLineAndCharacterOfPosition } from './utils';
import { TypeChecker } from '../compiler/checker';
import URI from 'vscode-uri/lib';

export interface ReferencesConfig {
    currentWorkspaceOnly: boolean;
};

export class ReferencesProvider extends AbstractProvider {
    private locations: lsp.Location[] = [];
    // private searchString: string;
    private searchSymbol: gt.Symbol;
    private checker: TypeChecker;
    public config: ReferencesConfig;

    constructor() {
        super();
        this.config = <ReferencesConfig>{
            currentWorkspaceOnly: false,
        };
    }

    private collectReferences(sourceFile: gt.SourceFile, child: gt.Node) {
        if (child.kind === gt.SyntaxKind.Identifier && this.checker.getSymbolAtLocation(child) === this.searchSymbol) {
            this.locations.push(<lsp.Location>{
                uri: sourceFile.fileName,
                range: {
                    start: getLineAndCharacterOfPosition(sourceFile, child.pos),
                    end: getLineAndCharacterOfPosition(sourceFile, child.end),
                }
            });
        }
        forEachChild(child, (node: gt.Node) => {
            this.collectReferences(sourceFile, node);
        });
    }

    public onReferences(params: lsp.ReferenceParams): lsp.Location[] {
        this.locations = [];

        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile) return;
        const position = getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = getAdjacentIdentfier(position, sourceFile);

        if (!currentToken) {
            return null;
        }

        this.checker = new TypeChecker(this.store);
        this.searchSymbol = this.checker.getSymbolAtLocation(currentToken);

        if (!this.searchSymbol) {
            return null;
        }

        for (const sourceFile of this.store.documents.values()) {
            if (this.config.currentWorkspaceOnly && this.store.rootPath) {
                if (!URI.parse(sourceFile.fileName).fsPath.startsWith(this.store.rootPath)) continue;
            }
            this.collectReferences(sourceFile, sourceFile);
        }

        return this.locations;
    }
}
