import { Parser } from './parser';
import * as Types from './types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from './types';
import { forEachChild } from './utils';

export function bindSourceFile(sourceFile: SourceFile) {
    let currentContainer: Types.Declaration;

    bind(sourceFile);

    function bind(node: Node) {
        let parentContainer = currentContainer;

        switch (node.kind) {
            case SyntaxKind.SourceFile:
            case SyntaxKind.VariableDeclaration:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.StructDeclaration:
            case SyntaxKind.ParameterDeclaration:
                addDeclaration(<Types.Declaration>node);
                break;
        }

        if (node.kind === SyntaxKind.SourceFile || node.kind === SyntaxKind.FunctionDeclaration || node.kind === SyntaxKind.StructDeclaration) {
            currentContainer = node;
        }
        forEachChild(node, child => bind(child));
        currentContainer = parentContainer;
    }

    // function createSymbolTable(symbols?: ReadonlyArray<Symbol>): SymbolTable {
    //     const result = new Map<string, Symbol>() as SymbolTable;
    //     if (symbols) {
    //         for (const symbol of symbols) {
    //             result.set(symbol.escapedName, symbol);
    //         }
    //     }
    //     return result;
    // }

    function addDeclaration(node: Types.Declaration): Symbol {
        let symbol: Symbol;
        let name: string;

        if (node.kind === SyntaxKind.SourceFile) {
            name = (<Types.SourceFile>node).fileName;
        }
        else {
            name = (<Types.NamedDeclaration>node).name.name
        }

        if (currentContainer !== undefined && currentContainer.symbol !== undefined) {
            if (currentContainer.symbol.members.has(name)) {
                symbol = currentContainer.symbol.members.get(name);
            }
        }

        if (symbol === undefined) {
            symbol = <Symbol>{
                escapedName: name,
                declarations: [],
                valueDeclaration: undefined,
                isAssigned: false,
                isReferenced: false,
                members: new Map<string, Symbol>(),
                parent: undefined,
            };
            if (currentContainer !== undefined) {
                currentContainer.symbol.members.set(name, symbol);
            }
        }

        node.symbol = symbol;
        symbol.declarations.push(node);

        return symbol;
    }
}
