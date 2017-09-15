import * as Types from './types';
import { SyntaxKind } from './types';

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

                // case "referenceDiagnostics":
                // case "parseDiagnostics":
                //     o[propertyName] = Utils.convertDiagnostics((<any>n)[propertyName]);
                //     break;

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
