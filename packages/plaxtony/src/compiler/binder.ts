import { Parser } from './parser';
import * as gt from './types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable, NamedDeclaration } from './types';
import { forEachChild, isNamedDeclarationKind, isDeclarationKind, isContainerKind } from './utils';
import { Store } from '../service/store';

export function bindSourceFile(sourceFile: SourceFile, store: Store) {
    let currentScope: gt.Declaration;
    let currentContainer: gt.NamedDeclaration;

    bind(sourceFile);

    function bind(node: Node) {
        let parentScope = currentScope;
        let parentContainer = currentContainer;

        if (isDeclarationKind(node.kind)) {
            switch (node.kind) {
                case SyntaxKind.SourceFile:
                {
                    declareSymbol(<gt.Declaration>node, null);
                    break;
                }

                case SyntaxKind.CallExpression:
                case SyntaxKind.PropertyAccessExpression:
                {
                    // TODO: to be reomved?
                    // declareSymbol(<gt.Declaration>node, null);
                    break;
                }

                default:
                {
                    declareSymbol(<gt.Declaration>node, currentContainer.symbol);
                    break;
                }
            }
        }

        // if (node.kind === SyntaxKind.SourceFile || node.kind === SyntaxKind.FunctionDeclaration || node.kind === SyntaxKind.StructDeclaration) {
        if (isContainerKind(node.kind)) {
            currentContainer = <gt.NamedDeclaration>node;
        }
        if (isDeclarationKind(node.kind)) {
            currentScope = <gt.Declaration>node;
        }
        forEachChild(node, child => bind(child));

        currentScope = parentScope;
        currentContainer = parentContainer;
    }

    function getDeclarationName(node: Node): string {
        switch (node.kind) {
            case SyntaxKind.SourceFile:
            {
                return (<gt.SourceFile>node).fileName;
                break;
            }

            case SyntaxKind.VariableDeclaration:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.StructDeclaration:
            case SyntaxKind.ParameterDeclaration:
            case SyntaxKind.PropertyDeclaration:
            {
                return (<gt.NamedDeclaration>node).name.name;
                break;
            }

            case SyntaxKind.PropertyAccessExpression:
            {
                return '__prop__' + (<gt.PropertyAccessExpression>node).name.name;
                break;
            }

            case SyntaxKind.CallExpression:
            {
                const call = <gt.CallExpression>node;
                if (call.expression.kind === gt.SyntaxKind.Identifier) {
                    return (<gt.Identifier>call.expression).name;
                }
                else {
                    // TODO: properly named call expressions such as: st.member_fns[12]();
                    return '__()';
                }
                break;
            }
        }
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

    function declareSymbol(node: gt.Declaration, parentSymbol?: Symbol): Symbol {
        let scopedSymbolTable: Symbol;
        let nodeSymbol: Symbol;
        let name: string;

        name = getDeclarationName(node);

        if (parentSymbol && parentSymbol.members.has(name)) {
            nodeSymbol = parentSymbol.members.get(name);
        }
        else {
            if (parentSymbol && parentSymbol.declarations[0].kind === gt.SyntaxKind.SourceFile) {
                nodeSymbol = store.resolveGlobalSymbol(name);
            }
            if (!nodeSymbol) {
                nodeSymbol = <Symbol>{
                    escapedName: name,
                    declarations: [],
                    valueDeclaration: undefined,
                    isAssigned: false,
                    isReferenced: false,
                    members: new Map<string, Symbol>(),
                    parent: undefined,
                };

                switch (node.kind) {
                    case gt.SyntaxKind.VariableDeclaration:
                    case gt.SyntaxKind.ParameterDeclaration:
                        nodeSymbol.flags = (
                            (parentSymbol && parentSymbol.declarations[0].kind == gt.SyntaxKind.SourceFile) ?
                            gt.SymbolFlags.GlobalVariable : gt.SymbolFlags.FunctionScopedVariable
                        );
                        break;
                    case gt.SyntaxKind.FunctionDeclaration:
                        nodeSymbol.flags = gt.SymbolFlags.Function;
                        break;
                    case gt.SyntaxKind.StructDeclaration:
                        nodeSymbol.flags = gt.SymbolFlags.Struct;
                        break;
                    case gt.SyntaxKind.PropertyDeclaration:
                        nodeSymbol.flags = gt.SymbolFlags.Property;
                        break;
                }
            }

            if (parentSymbol) {
                parentSymbol.members.set(name, nodeSymbol);
            }
        }

        node.symbol = nodeSymbol;
        nodeSymbol.declarations.push(node);

        if (!node.symbol.valueDeclaration && (
            (node.kind === gt.SyntaxKind.FunctionDeclaration && (<gt.FunctionDeclaration>node).body) ||
            (node.kind === gt.SyntaxKind.VariableDeclaration && (<gt.VariableDeclaration>node).initializer)
        )) {
            node.symbol.valueDeclaration = node;
        }

        return nodeSymbol;
    }
}
