import { Parser } from './parser';
import * as gt from './types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable, NamedDeclaration } from './types';
import { forEachChild, isNamedDeclarationKind, isDeclarationKind, isContainerKind, getSourceFileOfNode } from './utils';
import { IStoreSymbols } from '../service/store';
// import { SignatureMeta, TypeChecker } from './checker';

export function getDeclarationName(node: Node): string {
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
        case SyntaxKind.TypedefDeclaration:
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

export function declareSymbol(node: gt.Declaration, store: IStoreSymbols, parentSymbol?: Symbol): Symbol {
    let scopedSymbolTable: Symbol;
    let nodeSymbol: Symbol;
    let name: string;

    name = getDeclarationName(node);
    if (!name) {
        name = '__anonymous';
    }

    if (parentSymbol && parentSymbol.members.has(name)) {
        nodeSymbol = parentSymbol.members.get(name);
    }
    else {
        let isStatic = false;
        if (node.modifiers) {
            isStatic = node.modifiers.some((value) => value.kind === gt.SyntaxKind.StaticKeyword);
        }

        if (parentSymbol && !isStatic && parentSymbol.declarations[0].kind === gt.SyntaxKind.SourceFile) {
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
                parent: parentSymbol,
            };

            switch (node.kind) {
                case gt.SyntaxKind.ParameterDeclaration:
                    nodeSymbol.flags = gt.SymbolFlags.FunctionParameter;
                    break;
                case gt.SyntaxKind.VariableDeclaration:
                    nodeSymbol.flags = (
                        (parentSymbol && parentSymbol.declarations[0].kind == gt.SyntaxKind.SourceFile) ?
                        gt.SymbolFlags.GlobalVariable : gt.SymbolFlags.LocalVariable
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
                case gt.SyntaxKind.TypedefDeclaration:
                    nodeSymbol.flags = gt.SymbolFlags.Typedef;
                    break;
            }

            switch (node.kind) {
                case gt.SyntaxKind.VariableDeclaration:
                case gt.SyntaxKind.FunctionDeclaration:
                {
                    if (isStatic) {
                        nodeSymbol.flags |= gt.SymbolFlags.Static;
                    }
                    break;
                }
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

export function bindSourceFile(sourceFile: SourceFile, store: IStoreSymbols) {
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
                    declareSymbol(<gt.Declaration>node, store, null);
                    break;
                }
                default:
                {
                    declareSymbol(<gt.Declaration>node, store, currentContainer.symbol);
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
}

export function unbindSourceFile(sourceFile: SourceFile, store: IStoreSymbols) {
    function unbindSymbol(parentSymbol: Symbol) {
        for (const symbol of parentSymbol.members.values()) {
            symbol.declarations = symbol.declarations.filter((decl) => {
                return getSourceFileOfNode(decl) !== sourceFile;
            });
            if (symbol.declarations.length) {
                unbindSymbol(symbol);
            }
            else {
                parentSymbol.members.delete(symbol.escapedName);
            }
        }
    }

    unbindSymbol(sourceFile.symbol);
}
