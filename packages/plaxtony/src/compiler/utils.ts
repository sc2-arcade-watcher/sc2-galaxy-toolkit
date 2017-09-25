import * as Types from './types';
import { SyntaxKind, SyntaxKindMarker, Node, NodeArray } from './types';

export function formatStringFromArgs(text: string, args: { [index: number]: string; }, baseIndex?: number): string {
    baseIndex = baseIndex || 0;

    return text.replace(/{(\d+)}/g, (_match, index?) => args[+index + baseIndex!]);
}

export function createFileDiagnostic(file: Types.SourceFile, start: number, length: number, message: Types.DiagnosticMessage, ...args: (string | number)[]): Types.Diagnostic;
export function createFileDiagnostic(file: Types.SourceFile, start: number, length: number, message: Types.DiagnosticMessage): Types.Diagnostic {
    const end = start + length;

    // Debug.assert(start >= 0, "start must be non-negative, is " + start);
    // Debug.assert(length >= 0, "length must be non-negative, is " + length);

    // if (file) {
    //     Debug.assert(start <= file.text.length, `start must be within the bounds of the file. ${start} > ${file.text.length}`);
    //     Debug.assert(end <= file.text.length, `end must be the bounds of the file. ${end} > ${file.text.length}`);
    // }

    let text = message.message;

    if (arguments.length > 4) {
        text = formatStringFromArgs(text, arguments, 4);
    }

    return {
        file,
        start,
        length,

        messageText: text,
        category: message.category,
        code: message.code,
    };
}

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

export function isAssignmentOperator(token: SyntaxKind): boolean {
    return token >= SyntaxKind.EqualsToken && token <= SyntaxKind.CaretEqualsToken;
}

function isLeftHandSideExpressionKind(kind: SyntaxKind): boolean {
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

export function isLeftHandSideExpression(node: Types.Node): boolean {
    return isLeftHandSideExpressionKind(node.kind);
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
        // case SyntaxKind.TypeReference:
        //     return visitNode(cbNode, (<Types.TypeReferenceNode>node).typeName) ||
        //         visitNodes(cbNode, cbNodes, (<Types.TypeReferenceNode>node).typeArguments);
        // case SyntaxKind.LiteralType:
        //     return visitNode(cbNode, (<Types.LiteralTypeNode>node).literal);
        // case SyntaxKind.ArrayLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ArrayLiteralExpression>node).elements);
        // case SyntaxKind.ObjectLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ObjectLiteralExpression>node).properties);
        // case SyntaxKind.PropertyAccessExpression:
        //     return visitNode(cbNode, (<Types.PropertyAccessExpression>node).expression) ||
        //         visitNode(cbNode, (<Types.PropertyAccessExpression>node).name);
        // case SyntaxKind.ElementAccessExpression:
        //     return visitNode(cbNode, (<Types.ElementAccessExpression>node).expression) ||
        //         visitNode(cbNode, (<Types.ElementAccessExpression>node).argumentExpression);
        // case SyntaxKind.CallExpression:
        // case SyntaxKind.NewExpression:
        //     return visitNode(cbNode, (<Types.CallExpression>node).expression) ||
        //         visitNodes(cbNode, cbNodes, (<Types.CallExpression>node).typeArguments) ||
        //         visitNodes(cbNode, cbNodes, (<Types.CallExpression>node).arguments);
        // case SyntaxKind.TaggedTemplateExpression:
        //     return visitNode(cbNode, (<Types.TaggedTemplateExpression>node).tag) ||
        //         visitNode(cbNode, (<Types.TaggedTemplateExpression>node).template);
        // case SyntaxKind.TypeAssertionExpression:
        //     return visitNode(cbNode, (<Types.TypeAssertion>node).type) ||
        //         visitNode(cbNode, (<Types.TypeAssertion>node).expression);
        // case SyntaxKind.ParenthesizedExpression:
        //     return visitNode(cbNode, (<Types.ParenthesizedExpression>node).expression);
        // case SyntaxKind.DeleteExpression:
        //     return visitNode(cbNode, (<Types.DeleteExpression>node).expression);
        // case SyntaxKind.TypeOfExpression:
        //     return visitNode(cbNode, (<Types.TypeOfExpression>node).expression);
        // case SyntaxKind.VoidExpression:
        //     return visitNode(cbNode, (<Types.VoidExpression>node).expression);
        // case SyntaxKind.PrefixUnaryExpression:
        //     return visitNode(cbNode, (<Types.PrefixUnaryExpression>node).operand);
        // case SyntaxKind.YieldExpression:
        //     return visitNode(cbNode, (<Types.YieldExpression>node).asteriskToken) ||
        //         visitNode(cbNode, (<Types.YieldExpression>node).expression);
        // case SyntaxKind.AwaitExpression:
        //     return visitNode(cbNode, (<Types.AwaitExpression>node).expression);
        // case SyntaxKind.PostfixUnaryExpression:
        //     return visitNode(cbNode, (<Types.PostfixUnaryExpression>node).operand);
        // case SyntaxKind.BinaryExpression:
        //     return visitNode(cbNode, (<Types.BinaryExpression>node).left) ||
        //         visitNode(cbNode, (<Types.BinaryExpression>node).operatorToken) ||
        //         visitNode(cbNode, (<Types.BinaryExpression>node).right);
        // case SyntaxKind.AsExpression:
        //     return visitNode(cbNode, (<Types.AsExpression>node).expression) ||
        //         visitNode(cbNode, (<Types.AsExpression>node).type);
        // case SyntaxKind.NonNullExpression:
        //     return visitNode(cbNode, (<Types.NonNullExpression>node).expression);
        // case SyntaxKind.MetaProperty:
        //     return visitNode(cbNode, (<Types.MetaProperty>node).name);
        // case SyntaxKind.ConditionalExpression:
        //     return visitNode(cbNode, (<Types.ConditionalExpression>node).condition) ||
        //         visitNode(cbNode, (<Types.ConditionalExpression>node).questionToken) ||
        //         visitNode(cbNode, (<Types.ConditionalExpression>node).whenTrue) ||
        //         visitNode(cbNode, (<Types.ConditionalExpression>node).colonToken) ||
        //         visitNode(cbNode, (<Types.ConditionalExpression>node).whenFalse);
        // case SyntaxKind.SpreadElement:
        //     return visitNode(cbNode, (<Types.SpreadElement>node).expression);
        case SyntaxKind.Block:
            return visitNodes(cbNode, cbNodes, (<Types.Block>node).statements);
        case SyntaxKind.SourceFile:
            return visitNodes(cbNode, cbNodes, (<Types.SourceFile>node).statements);
        // case SyntaxKind.VariableStatement:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.VariableStatement>node).declarationList);
        // case SyntaxKind.VariableDeclarationList:
        //     return visitNodes(cbNode, cbNodes, (<Types.VariableDeclarationList>node).declarations);
        // case SyntaxKind.ExpressionStatement:
        //     return visitNode(cbNode, (<Types.ExpressionStatement>node).expression);
        // case SyntaxKind.IfStatement:
        //     return visitNode(cbNode, (<Types.IfStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.IfStatement>node).thenStatement) ||
        //         visitNode(cbNode, (<Types.IfStatement>node).elseStatement);
        // case SyntaxKind.DoStatement:
        //     return visitNode(cbNode, (<Types.DoStatement>node).statement) ||
        //         visitNode(cbNode, (<Types.DoStatement>node).expression);
        // case SyntaxKind.WhileStatement:
        //     return visitNode(cbNode, (<Types.WhileStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.WhileStatement>node).statement);
        // case SyntaxKind.ForStatement:
        //     return visitNode(cbNode, (<Types.ForStatement>node).initializer) ||
        //         visitNode(cbNode, (<Types.ForStatement>node).condition) ||
        //         visitNode(cbNode, (<Types.ForStatement>node).incrementor) ||
        //         visitNode(cbNode, (<Types.ForStatement>node).statement);
        // case SyntaxKind.ForInStatement:
        //     return visitNode(cbNode, (<Types.ForInStatement>node).initializer) ||
        //         visitNode(cbNode, (<Types.ForInStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.ForInStatement>node).statement);
        // case SyntaxKind.ForOfStatement:
        //     return visitNode(cbNode, (<Types.ForOfStatement>node).awaitModifier) ||
        //         visitNode(cbNode, (<Types.ForOfStatement>node).initializer) ||
        //         visitNode(cbNode, (<Types.ForOfStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.ForOfStatement>node).statement);
        // case SyntaxKind.ContinueStatement:
        // case SyntaxKind.BreakStatement:
        //     return visitNode(cbNode, (<Types.BreakOrContinueStatement>node).label);
        // case SyntaxKind.ReturnStatement:
        //     return visitNode(cbNode, (<Types.ReturnStatement>node).expression);
        // case SyntaxKind.WithStatement:
        //     return visitNode(cbNode, (<Types.WithStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.WithStatement>node).statement);
        // case SyntaxKind.SwitchStatement:
        //     return visitNode(cbNode, (<Types.SwitchStatement>node).expression) ||
        //         visitNode(cbNode, (<Types.SwitchStatement>node).caseBlock);
        // case SyntaxKind.CaseBlock:
        //     return visitNodes(cbNode, cbNodes, (<Types.CaseBlock>node).clauses);
        // case SyntaxKind.CaseClause:
        //     return visitNode(cbNode, (<Types.CaseClause>node).expression) ||
        //         visitNodes(cbNode, cbNodes, (<Types.CaseClause>node).statements);
        // case SyntaxKind.DefaultClause:
        //     return visitNodes(cbNode, cbNodes, (<Types.DefaultClause>node).statements);
        // case SyntaxKind.LabeledStatement:
        //     return visitNode(cbNode, (<Types.LabeledStatement>node).label) ||
        //         visitNode(cbNode, (<Types.LabeledStatement>node).statement);
        // case SyntaxKind.ThrowStatement:
        //     return visitNode(cbNode, (<Types.ThrowStatement>node).expression);
        // case SyntaxKind.TryStatement:
        //     return visitNode(cbNode, (<Types.TryStatement>node).tryBlock) ||
        //         visitNode(cbNode, (<Types.TryStatement>node).catchClause) ||
        //         visitNode(cbNode, (<Types.TryStatement>node).finallyBlock);
        // case SyntaxKind.CatchClause:
        //     return visitNode(cbNode, (<Types.CatchClause>node).variableDeclaration) ||
        //         visitNode(cbNode, (<Types.CatchClause>node).block);
        // case SyntaxKind.Decorator:
        //     return visitNode(cbNode, (<Types.Decorator>node).expression);
        // case SyntaxKind.ClassDeclaration:
        // case SyntaxKind.ClassExpression:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ClassLikeDeclaration>node).name) ||
        //         visitNodes(cbNode, cbNodes, (<Types.ClassLikeDeclaration>node).typeParameters) ||
        //         visitNodes(cbNode, cbNodes, (<Types.ClassLikeDeclaration>node).heritageClauses) ||
        //         visitNodes(cbNode, cbNodes, (<Types.ClassLikeDeclaration>node).members);
        // case SyntaxKind.InterfaceDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.InterfaceDeclaration>node).name) ||
        //         visitNodes(cbNode, cbNodes, (<Types.InterfaceDeclaration>node).typeParameters) ||
        //         visitNodes(cbNode, cbNodes, (<Types.ClassDeclaration>node).heritageClauses) ||
        //         visitNodes(cbNode, cbNodes, (<Types.InterfaceDeclaration>node).members);
        // case SyntaxKind.TypeAliasDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.TypeAliasDeclaration>node).name) ||
        //         visitNodes(cbNode, cbNodes, (<Types.TypeAliasDeclaration>node).typeParameters) ||
        //         visitNode(cbNode, (<Types.TypeAliasDeclaration>node).type);
        // case SyntaxKind.EnumDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.EnumDeclaration>node).name) ||
        //         visitNodes(cbNode, cbNodes, (<Types.EnumDeclaration>node).members);
        // case SyntaxKind.EnumMember:
        //     return visitNode(cbNode, (<Types.EnumMember>node).name) ||
        //         visitNode(cbNode, (<Types.EnumMember>node).initializer);
        // case SyntaxKind.ModuleDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ModuleDeclaration>node).name) ||
        //         visitNode(cbNode, (<Types.ModuleDeclaration>node).body);
        // case SyntaxKind.ImportEqualsDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ImportEqualsDeclaration>node).name) ||
        //         visitNode(cbNode, (<Types.ImportEqualsDeclaration>node).moduleReference);
        // case SyntaxKind.ImportDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ImportDeclaration>node).importClause) ||
        //         visitNode(cbNode, (<Types.ImportDeclaration>node).moduleSpecifier);
        // case SyntaxKind.ImportClause:
        //     return visitNode(cbNode, (<Types.ImportClause>node).name) ||
        //         visitNode(cbNode, (<Types.ImportClause>node).namedBindings);
        // case SyntaxKind.NamespaceExportDeclaration:
        //     return visitNode(cbNode, (<Types.NamespaceExportDeclaration>node).name);

        // case SyntaxKind.NamespaceImport:
        //     return visitNode(cbNode, (<Types.NamespaceImport>node).name);
        // case SyntaxKind.NamedImports:
        // case SyntaxKind.NamedExports:
        //     return visitNodes(cbNode, cbNodes, (<Types.NamedImportsOrExports>node).elements);
        // case SyntaxKind.ExportDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ExportDeclaration>node).exportClause) ||
        //         visitNode(cbNode, (<Types.ExportDeclaration>node).moduleSpecifier);
        // case SyntaxKind.ImportSpecifier:
        // case SyntaxKind.ExportSpecifier:
        //     return visitNode(cbNode, (<Types.ImportOrExportSpecifier>node).propertyName) ||
        //         visitNode(cbNode, (<Types.ImportOrExportSpecifier>node).name);
        // case SyntaxKind.ExportAssignment:
        //     return visitNodes(cbNode, cbNodes, node.decorators) ||
        //         visitNodes(cbNode, cbNodes, node.modifiers) ||
        //         visitNode(cbNode, (<Types.ExportAssignment>node).expression);
        // case SyntaxKind.TemplateExpression:
        //     return visitNode(cbNode, (<Types.TemplateExpression>node).head) || visitNodes(cbNode, cbNodes, (<Types.TemplateExpression>node).templateSpans);
        // case SyntaxKind.TemplateSpan:
        //     return visitNode(cbNode, (<Types.TemplateSpan>node).expression) || visitNode(cbNode, (<Types.TemplateSpan>node).literal);
        // case SyntaxKind.ComputedPropertyName:
        //     return visitNode(cbNode, (<Types.ComputedPropertyName>node).expression);
        // case SyntaxKind.HeritageClause:
        //     return visitNodes(cbNode, cbNodes, (<Types.HeritageClause>node).types);
        // case SyntaxKind.ExpressionWithTypeArguments:
        //     return visitNode(cbNode, (<Types.ExpressionWithTypeArguments>node).expression) ||
        //         visitNodes(cbNode, cbNodes, (<Types.ExpressionWithTypeArguments>node).typeArguments);
        // case SyntaxKind.ExternalModuleReference:
        //     return visitNode(cbNode, (<Types.ExternalModuleReference>node).expression);
        // case SyntaxKind.MissingDeclaration:
        //     return visitNodes(cbNode, cbNodes, node.decorators);
        // case SyntaxKind.CommaListExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.CommaListExpression>node).elements);
    }
}

