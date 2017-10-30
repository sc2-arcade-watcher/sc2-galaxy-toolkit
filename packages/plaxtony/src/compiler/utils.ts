import * as Types from './types';
import { SyntaxKind, SyntaxKindMarker, Node, NodeArray } from './types';

/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
export function isToken(n: Node): boolean {
    return <number>n.kind >= SyntaxKindMarker.FirstToken && <number>n.kind <= SyntaxKindMarker.LastToken;
}

export function isModifierKind(token: SyntaxKind): boolean {
    switch (token) {
        case SyntaxKind.ConstKeyword:
        case SyntaxKind.StaticKeyword:
        case SyntaxKind.NativeKeyword:
            return true;
    }
    return false;
}

export function isKeywordTypeKind(token: SyntaxKind): boolean {
    switch (token) {
        case SyntaxKind.AbilcmdKeyword:
        case SyntaxKind.ActorKeyword:
        case SyntaxKind.ActorscopeKeyword:
        case SyntaxKind.AifilterKeyword:
        case SyntaxKind.AnimfilterKeyword:
        case SyntaxKind.BankKeyword:
        case SyntaxKind.BoolKeyword:
        case SyntaxKind.ByteKeyword:
        case SyntaxKind.CamerainfoKeyword:
        case SyntaxKind.CharKeyword:
        case SyntaxKind.ColorKeyword:
        case SyntaxKind.DoodadKeyword:
        case SyntaxKind.FixedKeyword:
        case SyntaxKind.HandleKeyword:
        case SyntaxKind.GenerichandleKeyword:
        case SyntaxKind.EffecthistoryKeyword:
        case SyntaxKind.IntKeyword:
        case SyntaxKind.MarkerKeyword:
        case SyntaxKind.OrderKeyword:
        case SyntaxKind.PlayergroupKeyword:
        case SyntaxKind.PointKeyword:
        case SyntaxKind.RegionKeyword:
        case SyntaxKind.RevealerKeyword:
        case SyntaxKind.SoundKeyword:
        case SyntaxKind.SoundlinkKeyword:
        case SyntaxKind.StringKeyword:
        case SyntaxKind.TextKeyword:
        case SyntaxKind.TimerKeyword:
        case SyntaxKind.TransmissionsourceKeyword:
        case SyntaxKind.TriggerKeyword:
        case SyntaxKind.UnitKeyword:
        case SyntaxKind.UnitfilterKeyword:
        case SyntaxKind.UnitgroupKeyword:
        case SyntaxKind.UnitrefKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.WaveKeyword:
        case SyntaxKind.WaveinfoKeyword:
        case SyntaxKind.WavetargetKeyword:
        case SyntaxKind.ArrayrefKeyword:
        case SyntaxKind.StructrefKeyword:
        case SyntaxKind.FuncrefKeyword:
            return true;
    }
    return false;
}

export function isReferenceKeywordKind(token: SyntaxKind): boolean {
    switch (token) {
        case SyntaxKind.ArrayrefKeyword:
        case SyntaxKind.StructrefKeyword:
        case SyntaxKind.FuncrefKeyword:
            return true;
    }
    return false;
}

export function isAssignmentOperator(token: SyntaxKind): boolean {
    return token >= SyntaxKind.EqualsToken && token <= SyntaxKind.CaretEqualsToken;
}

export function isLeftHandSideExpressionKind(kind: SyntaxKind): boolean {
    return kind === SyntaxKind.PropertyAccessExpression
        || kind === SyntaxKind.ElementAccessExpression
        || kind === SyntaxKind.CallExpression
        || kind === SyntaxKind.ParenthesizedExpression
        || kind === SyntaxKind.ArrayLiteralExpression
        || kind === SyntaxKind.Identifier
        || kind === SyntaxKind.NumericLiteral
        || kind === SyntaxKind.StringLiteral
        || kind === SyntaxKind.FalseKeyword
        || kind === SyntaxKind.NullKeyword
        || kind === SyntaxKind.TrueKeyword;
}

export function isContainerKind(kind: SyntaxKind): boolean {
    return kind === SyntaxKind.SourceFile
        || kind === SyntaxKind.FunctionDeclaration
        || kind === SyntaxKind.StructDeclaration
    ;
}

export function isNamedDeclarationKind(kind: SyntaxKind): boolean {
    return kind === SyntaxKind.SourceFile
        || kind === SyntaxKind.VariableDeclaration
        || kind === SyntaxKind.FunctionDeclaration
        || kind === SyntaxKind.StructDeclaration
        || kind === SyntaxKind.PropertyDeclaration
        || kind === SyntaxKind.PropertyAccessExpression
        || kind === SyntaxKind.ParameterDeclaration
    ;
}

export function isDeclarationKind(kind: SyntaxKind): boolean {
    return isNamedDeclarationKind(kind)
        || kind === SyntaxKind.CallExpression
    ;
}

export function isLeftHandSideExpression(node: Types.Node): boolean {
    return isLeftHandSideExpressionKind(node.kind);
}

export function isPartOfExpression(node: Node): boolean {
    switch (node.kind) {
        case SyntaxKind.NullKeyword:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.ArrayLiteralExpression:
        case SyntaxKind.PropertyAccessExpression:
        case SyntaxKind.ElementAccessExpression:
        case SyntaxKind.CallExpression:
        case SyntaxKind.TypeAssertionExpression:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.PrefixUnaryExpression:
        case SyntaxKind.PostfixUnaryExpression:
        case SyntaxKind.BinaryExpression:
        case SyntaxKind.Identifier:
            return true;
        case SyntaxKind.NumericLiteral:
        case SyntaxKind.StringLiteral:
            const parent = node.parent;
            switch (parent.kind) {
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.PropertyDeclaration:
                case SyntaxKind.ExpressionStatement:
                case SyntaxKind.IfStatement:
                case SyntaxKind.DoStatement:
                case SyntaxKind.WhileStatement:
                case SyntaxKind.ReturnStatement:
                case SyntaxKind.ForStatement:
                    const forStatement = <Types.ForStatement>parent;
                    return (forStatement.initializer === node) ||
                        forStatement.condition === node ||
                        forStatement.incrementor === node;
                default:
                    if (isPartOfExpression(parent)) {
                        return true;
                    }
            }
    }
    return false;
}

export function isPartOfTypeNode(node: Node): boolean {
        if (SyntaxKindMarker.FirstTypeNode <= <number>node.kind && <number>node.kind <= SyntaxKindMarker.LastTypeNode) {
            return true;
        }

        switch (node.kind) {
            case SyntaxKind.IntKeyword:
            case SyntaxKind.FixedKeyword:
            case SyntaxKind.StringKeyword:
            case SyntaxKind.BoolKeyword:
            case SyntaxKind.VoidKeyword:
                return true;

            // Identifiers and qualified names may be type nodes, depending on their context. Climb
            // above them to find the lowest container
            case SyntaxKind.Identifier:
                // If the identifier is the RHS of a qualified name, then it's a type iff its parent is.
                if (node.parent.kind === SyntaxKind.PropertyAccessExpression && (<Types.PropertyAccessExpression>node.parent).name === node) {
                    node = node.parent;
                }
                // At this point, node is either a qualified name or an identifier
                // Debug.assert(node.kind === SyntaxKind.Identifier || node.kind === SyntaxKind.QualifiedName || node.kind === SyntaxKind.PropertyAccessExpression,
                //     "'node' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'.");
                // falls through
            case SyntaxKind.PropertyAccessExpression:
                const parent = node.parent;
                // Do not recursively call isPartOfTypeNode on the parent. In the example:
                //
                //     let a: A.B.C;
                //
                // Calling isPartOfTypeNode would consider the qualified name A.B a type node.
                // Only C and A.B.C are type nodes.
                if (SyntaxKindMarker.FirstTypeNode <= <number>parent.kind && <number>parent.kind <= SyntaxKindMarker.LastTypeNode) {
                    return true;
                }
                switch (parent.kind) {
                    case SyntaxKind.PropertyDeclaration:
                    case SyntaxKind.ParameterDeclaration:
                    case SyntaxKind.VariableDeclaration:
                        return node === (<Types.VariableDeclaration>parent).type;
                    case SyntaxKind.FunctionDeclaration:
                        return node === (<Types.FunctionDeclaration>parent).type;
                    // TODO:
                    // case SyntaxKind.CallExpression:
                    //     return (<Types.CallExpression>parent).typeArguments && indexOf((<Types.CallExpression>parent).typeArguments, node) >= 0;
                }
        }

        return false;
    }

export function isRightSideOfPropertyAccess(node: Node) {
    return (node.parent.kind === SyntaxKind.PropertyAccessExpression && (<Types.PropertyAccessExpression>node.parent).name === node);
}

function isNodeOrArray(a: any): boolean {
    return a !== undefined && a.kind !== undefined;
}

export function getKindName(k: number | string): string {
    if (typeof k === "string") {
        return k;
    }

    // For some markers in SyntaxKind, we should print its original syntax name instead of
    // the marker name in tests.
    // if (k === (<any>Types).SyntaxKind.FirstJSDocNode ||
    //     k === (<any>Types).SyntaxKind.LastJSDocNode ||
    //     k === (<any>Types).SyntaxKind.FirstJSDocTagNode ||
    //     k === (<any>Types).SyntaxKind.LastJSDocTagNode) {
    //     for (const kindName in (<any>Types).SyntaxKind) {
    //         if ((<any>Types).SyntaxKind[kindName] === k) {
    //             return kindName;
    //         }
    //     }
    // }

    return (<any>Types).SyntaxKind[k];
}

export function sourceFileToJSON(file: Types.Node): string {
    return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");

    // function getFlagName(flags: any, f: number): any {
    //     if (f === 0) {
    //         return 0;
    //     }

    //     let result = "";
    //     forEach(Object.getOwnPropertyNames(flags), (v: any) => {
    //         if (isFinite(v)) {
    //             v = +v;
    //             if (f === +v) {
    //                 result = flags[v];
    //                 return true;
    //             }
    //             else if ((f & v) > 0) {
    //                 if (result.length) {
    //                     result += " | ";
    //                 }
    //                 result += flags[v];
    //                 return false;
    //             }
    //         }
    //     });
    //     return result;
    // }

    // function getNodeFlagName(f: number) { return getFlagName((<any>ts).NodeFlags, f); }

    function serializeNode(n: Types.Node): any {
        const o: any = { kind: getKindName(n.kind) };
        // if (ts.containsParseError(n)) {
        //     o.containsParseError = true;
        // }

        for (let propertyName in n) {
            switch (propertyName) {
                case "parent":
                case "symbol":
                case "locals":
                case "localSymbol":
                case "kind":
                case "semanticDiagnostics":
                case "id":
                case "nodeCount":
                case "symbolCount":
                case "identifierCount":
                case "scriptSnapshot":
                    // Blacklist of items we never put in the baseline file.
                    break;

                case "originalKeywordKind":
                    o[propertyName] = getKindName((<any>n)[propertyName]);
                    break;

                case "flags":
                    // Clear the flags that are produced by aggregating child values. That is ephemeral
                    // data we don't care about in the dump. We only care what the parser set directly
                    // on the AST.
                    // const flags = n.flags & ~(ts.NodeFlags.JavaScriptFile | ts.NodeFlags.HasAggregatedChildData);
                    // if (flags) {
                    //     o[propertyName] = getNodeFlagName(flags);
                    // }
                    break;

                case "referenceDiagnostics":
                case "parseDiagnostics":
                    // o[propertyName] = Utils.convertDiagnostics((<any>n)[propertyName]);
                    break;

                // case "nextContainer":
                //     if (n.nextContainer) {
                //         o[propertyName] = { kind: n.nextContainer.kind, pos: n.nextContainer.pos, end: n.nextContainer.end };
                //     }
                //     break;

                case "text":
                    // Include 'text' field for identifiers/literals, but not for source files.
                    if (n.kind !== Types.SyntaxKind.SourceFile) {
                        o[propertyName] = (<any>n)[propertyName];
                    }
                    break;

                default:
                    o[propertyName] = (<any>n)[propertyName];
            }
        }

        return o;
    }
}

/**
 * Iterates through the parent chain of a node and performs the callback on each parent until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, it applies the callback until the parent pointer is undefined or the callback returns "quit"
 * At that point findAncestor returns undefined.
 */
export function findAncestor<T extends Node>(node: Node, callback: (element: Node) => element is T): T | undefined;
export function findAncestor(node: Node, callback: (element: Node) => boolean | "quit"): Node | undefined;
export function findAncestor(node: Node, callback: (element: Node) => boolean | "quit"): Node {
    while (node) {
        const result = callback(node);
        if (result === "quit") {
            return undefined;
        }
        else if (result) {
            return node;
        }
        node = node.parent;
    }
    return undefined;
}

export function getSourceFileOfNode(node: Node): Types.SourceFile {
    while (node && node.kind !== SyntaxKind.SourceFile) {
        node = node.parent;
    }
    return <Types.SourceFile>node;
}

export function fixupParentReferences(rootNode: Node) {
    let parent: Node = rootNode;
    forEachChild(rootNode, visitNode);

    function visitNode(n: Node): void {
        // walk down setting parents that differ from the parent we think it should be.  This
        // allows us to quickly bail out of setting parents for subtrees during incremental
        // parsing
        if (n.parent !== parent) {
            n.parent = parent;

            const saveParent = parent;
            parent = n;
            forEachChild(n, visitNode);
            parent = saveParent;
        }
    }
}

function visitNode<T>(cbNode: (node?: Node) => T, node: Node): T | undefined {
    return node && cbNode(node);
}

function visitNodes<T>(cbNode: (node: Node) => T, cbNodes: (node: NodeArray<Node>) => T | undefined, nodes: NodeArray<Node>): T | undefined {
    if (nodes) {
        if (cbNodes) {
            return cbNodes(nodes);
        }
        for (const node of nodes) {
            const result = cbNode(node);
            if (result) {
                return result;
            }
        }
    }
}

/**
 * Invokes a callback for each child of the given node. The 'cbNode' callback is invoked for all child nodes
 * stored in properties. If a 'cbNodes' callback is specified, it is invoked for embedded arrays; otherwise,
 * embedded arrays are flattened and the 'cbNode' callback is invoked for each element. If a callback returns
 * a truthy value, iteration stops and that value is returned. Otherwise, undefined is returned.
 *
 * @param node a given node to visit its children
 * @param cbNode a callback to be invoked for all child nodes
 * @param cbNodes a callback to be invoked for embedded array
 *
 * @remarks `forEachChild` must visit the children of a node in the order
 * that they appear in the source code.
 */
export function forEachChild<T>(node: Node, cbNode: (node: Node) => T | undefined, cbNodes?: (nodes: NodeArray<Node>) => T | undefined): T | undefined {
    if (!node || !node.kind) {
        return;
    }
    switch (node.kind) {
        case SyntaxKind.PropertyDeclaration:
            return visitNodes(cbNode, cbNodes, (<Types.PropertyDeclaration>node).modifiers) ||
                visitNode(cbNode, (<Types.PropertyDeclaration>node).type) ||
                visitNode(cbNode, (<Types.PropertyDeclaration>node).name);
        case SyntaxKind.VariableDeclaration:
            return visitNodes(cbNode, cbNodes, (<Types.VariableDeclaration>node).modifiers) ||
                visitNode(cbNode, (<Types.VariableDeclaration>node).type) ||
                visitNode(cbNode, (<Types.VariableDeclaration>node).name) ||
                visitNode(cbNode, (<Types.VariableDeclaration>node).initializer);
        case SyntaxKind.FunctionDeclaration:
            return visitNodes(cbNode, cbNodes, (<Types.FunctionDeclaration>node).modifiers) ||
                visitNode(cbNode, (<Types.FunctionDeclaration>node).type) ||
                visitNode(cbNode, (<Types.FunctionDeclaration>node).name) ||
                visitNodes(cbNode, cbNodes, (<Types.FunctionDeclaration>node).parameters) ||
                visitNode(cbNode, (<Types.FunctionDeclaration>node).body);
        case SyntaxKind.StructDeclaration:
            return visitNodes(cbNode, cbNodes, (<Types.StructDeclaration>node).modifiers) ||
                visitNode(cbNode, (<Types.StructDeclaration>node).name) ||
                visitNodes(cbNode, cbNodes, (<Types.StructDeclaration>node).members);
        case SyntaxKind.ParameterDeclaration:
            return visitNodes(cbNode, cbNodes, (<Types.ParameterDeclaration>node).modifiers) ||
                visitNode(cbNode, (<Types.ParameterDeclaration>node).name) ||
                visitNode(cbNode, (<Types.ParameterDeclaration>node).type);
        case SyntaxKind.ArrayType:
            return visitNode(cbNode, (<Types.ArrayTypeNode>node).elementType) ||
                visitNode(cbNode, (<Types.ArrayTypeNode>node).size);
        case SyntaxKind.MappedType:
            return visitNode(cbNode, (<Types.MappedTypeNode>node).returnType) ||
                visitNodes(cbNode, cbNodes, (<Types.MappedTypeNode>node).typeArguments);
        // case SyntaxKind.TypeReference:
        //     return visitNode(cbNode, (<Types.TypeReferenceNode>node).typeName) ||
        //         visitNodes(cbNode, cbNodes, (<Types.TypeReferenceNode>node).typeArguments);
        // case SyntaxKind.LiteralType:
        //     return visitNode(cbNode, (<Types.LiteralTypeNode>node).literal);
        // case SyntaxKind.ArrayLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ArrayLiteralExpression>node).elements);
        // case SyntaxKind.ObjectLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ObjectLiteralExpression>node).properties);
        case SyntaxKind.PropertyAccessExpression:
            return visitNode(cbNode, (<Types.PropertyAccessExpression>node).expression) ||
                visitNode(cbNode, (<Types.PropertyAccessExpression>node).name);
        case SyntaxKind.ElementAccessExpression:
            return visitNode(cbNode, (<Types.ElementAccessExpression>node).expression) ||
                visitNode(cbNode, (<Types.ElementAccessExpression>node).argumentExpression);
        case SyntaxKind.CallExpression:
            return visitNode(cbNode, (<Types.CallExpression>node).expression) ||
                visitNodes(cbNode, cbNodes, (<Types.CallExpression>node).arguments);
        case SyntaxKind.ParenthesizedExpression:
            return visitNode(cbNode, (<Types.ParenthesizedExpression>node).expression);
        case SyntaxKind.PrefixUnaryExpression:
            return visitNode(cbNode, (<Types.PrefixUnaryExpression>node).operator) ||
                visitNode(cbNode, (<Types.PrefixUnaryExpression>node).operand);
        case SyntaxKind.PostfixUnaryExpression:
            return visitNode(cbNode, (<Types.PostfixUnaryExpression>node).operand) ||
                visitNode(cbNode, (<Types.PostfixUnaryExpression>node).operator);
        case SyntaxKind.BinaryExpression:
            return visitNode(cbNode, (<Types.BinaryExpression>node).left) ||
                visitNode(cbNode, (<Types.BinaryExpression>node).operatorToken) ||
                visitNode(cbNode, (<Types.BinaryExpression>node).right);
        case SyntaxKind.Block:
            return visitNodes(cbNode, cbNodes, (<Types.Block>node).statements);
        case SyntaxKind.SourceFile:
            return visitNodes(cbNode, cbNodes, (<Types.SourceFile>node).statements);
        case SyntaxKind.ExpressionStatement:
            return visitNode(cbNode, (<Types.ExpressionStatement>node).expression);
        case SyntaxKind.IfStatement:
            return visitNode(cbNode, (<Types.IfStatement>node).expression) ||
                visitNode(cbNode, (<Types.IfStatement>node).thenStatement) ||
                visitNode(cbNode, (<Types.IfStatement>node).elseStatement);
        case SyntaxKind.DoStatement:
            return visitNode(cbNode, (<Types.DoStatement>node).statement) ||
                visitNode(cbNode, (<Types.DoStatement>node).expression);
        case SyntaxKind.WhileStatement:
            return visitNode(cbNode, (<Types.WhileStatement>node).expression) ||
                visitNode(cbNode, (<Types.WhileStatement>node).statement);
        case SyntaxKind.ForStatement:
            return visitNode(cbNode, (<Types.ForStatement>node).initializer) ||
                visitNode(cbNode, (<Types.ForStatement>node).condition) ||
                visitNode(cbNode, (<Types.ForStatement>node).incrementor) ||
                visitNode(cbNode, (<Types.ForStatement>node).statement);
        case SyntaxKind.ContinueStatement:
        case SyntaxKind.BreakStatement:
            break;
        case SyntaxKind.ReturnStatement:
            return visitNode(cbNode, (<Types.ReturnStatement>node).expression);
    }
}

export function createDiagnosticForNode(node: Types.Node, category: Types.DiagnosticCategory, msg: string): Types.Diagnostic {
    return <Types.Diagnostic>{
        file: getSourceFileOfNode(node),
        category: category,
        start: node.pos,
        length: node.end - node.pos,
        line: node.line,
        col: node.char,
        messageText: msg,
    };
}
