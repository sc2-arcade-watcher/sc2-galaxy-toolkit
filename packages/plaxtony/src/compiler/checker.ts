import * as gt from './types';
import { isDeclarationKind, forEachChild } from './utils';
import { Store } from '../service/store';

export class TypeChecker {
    private store: Store;

    constructor(store: Store) {
        this.store = store;
    }

    private resolveGlobalSymbol(node: gt.Identifier): gt.Symbol | undefined {
        for (const document of this.store.documents.values()) {
            const symbol = document.symbol.members.get(node.name);
            if (symbol) {
                return symbol;
            }
        }
    }

    private resolvePropertySymbol(node: gt.PropertyAccessExpression): gt.Symbol | undefined {
        if (node.expression.kind === gt.SyntaxKind.Identifier) {
            return this.resolveGlobalSymbol(<gt.Identifier>node.expression);
        }
        else if (node.expression.kind === gt.SyntaxKind.PropertyAccessExpression) {
            return this.resolvePropertySymbol(<gt.PropertyAccessExpression>node.expression);
        }
    }

    private getSymbolOfEntityNameOrPropertyAccessExpression(node: gt.Identifier | gt.PropertyAccessExpression): gt.Symbol | undefined {
        // if (isDeclarationKind(node.parent.kind)) {
        //     return (<gt.Declaration>node.parent).symbol;
        // }
        if (node.kind === gt.SyntaxKind.Identifier) {
        }
        return;
    }

    // public getRootSymbols(symbol: Symbol): Symbol[] {
    // }

    public getSymbolAtLocation(node: gt.Node): gt.Symbol | undefined {
        switch (node.kind) {
            case gt.SyntaxKind.Identifier:
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(<gt.Identifier | gt.PropertyAccessExpression>node);
        }
        // if (node.kind === gt.SyntaxKind.Identifier) {
        //     return (<gt.Identifier>node).
        // }
    }

    // getTypeAtLocation(node: Node): Type;
    // getTypeFromTypeNode(node: TypeNode): Type;
    // signatureToString(signature: Signature, enclosingDeclaration?: Node, flags?: TypeFormatFlags, kind?: SignatureKind): string;
    // typeToString(type: Type, enclosingDeclaration?: Node, flags?: TypeFormatFlags): string;
    // symbolToString(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags): string;

    public computeSymbolTargets(rootNode: gt.Node) {
        let selectionElements: gt.Node[] = [];
        let selectionDepth = 0;
        let resolvedSelection = false;
        let selectedScope = null;
        const self = this;

        function resolveIdentifierSymbol(identifier: gt.Identifier) {
            console.log('resolved', identifier.name, 'to', selectionElements[selectionElements.length - 1 - selectionDepth]);
        }

        function visitNode(node: gt.Node) {
            switch (node.kind) {
                case gt.SyntaxKind.PropertyAccessExpression: {
                    const propertyAccess = <gt.PropertyAccessExpression> node;

                    if (
                        propertyAccess.expression.kind !== gt.SyntaxKind.PropertyAccessExpression &&
                        propertyAccess.expression.kind !== gt.SyntaxKind.Identifier
                    ) {
                        self.computeSymbolTargets((<gt.ElementAccessExpression>propertyAccess.expression).argumentExpression);
                    }

                    selectionElements.push(propertyAccess.name);

                    if (propertyAccess.expression.kind === gt.SyntaxKind.Identifier) {
                        selectionElements.push(propertyAccess.expression);
                        // console.log('final', selectionScopes.length);
                        // console.log('::: ', selectionScopes);
                        // selectionScopes = [];
                        // resolvedSelection = true;
                    }
                    // if (resolvedSelection) {
                    //     console.log('resolved');
                    // }
                    visitNode(propertyAccess.expression);

                    if (propertyAccess.expression.kind === gt.SyntaxKind.Identifier) {
                        resolveIdentifierSymbol(<gt.Identifier>(propertyAccess.expression));
                        ++selectionDepth;
                    }
                    resolveIdentifierSymbol(propertyAccess.name);
                    ++selectionDepth;

                    return true;
                }

                case gt.SyntaxKind.Identifier: {
                    // console.log('ident: ', (<gt.Identifier>node).name);
                    // console.log(selectionScopes.length);
                    // if (scopes.length) {
                    //     console.log('::: ', scopes);
                    //     scopes = [];
                    // }
                    break;
                }
            }

            forEachChild(node, visitNode);
        }

        visitNode(rootNode);
        // forEachChild(rootNode, child => visitNode(child));
    }
}
