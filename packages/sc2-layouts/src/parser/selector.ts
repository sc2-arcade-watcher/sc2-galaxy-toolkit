import { CharacterCodes } from './scanner';
import { AttrValueKind } from '../types';
import { reverseMap } from '../common';

export const enum BuiltinHandleKind {
    This,
    Parent,
    Root,
    Layer,
    Sibling,
    Ancestor,
}

export const builtinHandlesTable = new Map<string, BuiltinHandleKind>([
    ['this', BuiltinHandleKind.This],
    ['parent', BuiltinHandleKind.Parent],
    ['root', BuiltinHandleKind.Root],
    ['layer', BuiltinHandleKind.Layer],
    ['sibling', BuiltinHandleKind.Sibling],
    ['ancestor', BuiltinHandleKind.Ancestor],
]);

export const builtinHandlesNameTable = new Map<BuiltinHandleKind, string>(reverseMap(builtinHandlesTable));

export const enum SelectionFragmentKind {
    Unknown,
    BuiltinHandle,
    CustomHandle,
    Identifier,
}

enum AncestorArgName {
    'name',
    'type',
    'oftype',
}
type AncestorArguments = 'name' | 'type' | 'oftype';

export interface SelectionFragment {
    kind: SelectionFragmentKind;
    len: number;
    builtinHandle?: BuiltinHandleKind;
    customHandle?: string;
    identifier?: string;
    argument?: {
        name: AncestorArguments;
        value: string;
    };
    siblingIndex?: number;
    error?: string;
}

export interface FrameSelect {
    fragments: SelectionFragment[];
    errors?: string[];
}

export interface FramePropSelect extends FrameSelect {
    propertyName?: string;
    propertyIndex?: string;
}

export interface DescSelect extends FrameSelect {}

function isIdentifierPart(ch: number): boolean {
    return (ch >= CharacterCodes.A && ch <= CharacterCodes.Z)
        || (ch >= CharacterCodes.a && ch <= CharacterCodes.z)
        || (ch >= CharacterCodes._0 && ch <= CharacterCodes._9)
        || (ch === CharacterCodes._)
    ;
}

const reSelArg = /^@([^=]+)=(\w*)$/;
const reSibling = /^([-+][0-9]+)$/;

function parseSelectorFragment(input: string): SelectionFragment {
    const frag = <SelectionFragment>{
        len: input.length,
    };

    if (!input.length) {
        frag.kind = SelectionFragmentKind.Unknown;
        frag.error = 'Empty str';
        return frag;
    }

    if (input.charCodeAt(0) === CharacterCodes.$) {
        let offset = 1;
        for (; offset < input.length; ++offset) {
            if (!isIdentifierPart(input.charCodeAt(offset))) {
                break;
            }
        }

        if (offset > 1) {
            const inHandle = input.substring(1, offset);
            const inBuiltHandle = builtinHandlesTable.get(inHandle);

            if (typeof inBuiltHandle !== 'undefined') {
                frag.kind = SelectionFragmentKind.BuiltinHandle;
                frag.builtinHandle = inBuiltHandle;

                if (offset < input.length) {
                    if (frag.builtinHandle === BuiltinHandleKind.Ancestor) {
                        if (
                            input.charCodeAt(offset) !== CharacterCodes.openBracket ||
                            input.charCodeAt(input.length - 1) !== CharacterCodes.closeBracket
                        ) {
                            frag.error = 'expected []'
                        }
                        else {
                            const args = input.substring(offset + 1, input.length - 1);
                            const m = args.match(reSelArg);
                            if (m) {
                                if ((<any>AncestorArgName)[m[1]] === void 0) {
                                    frag.error = 'expected ';
                                }
                                frag.argument = {
                                    name: <AncestorArguments>m[1],
                                    value: m[2],
                                };
                            }
                            else {
                                frag.error = '$ancestor syntax err';
                            }
                        }
                    }
                    else if (frag.builtinHandle === BuiltinHandleKind.Sibling) {
                        const m = input.substr(offset).match(reSibling);
                        if (m) {
                            frag.siblingIndex = Number(m[1]);
                        }
                        else {
                            frag.error = `$sibling expected relative index, found "${input.substr(offset)}"`;
                        }
                    }
                    else {
                        frag.error = `unexpected "${input.substr(offset)}"`;
                    }
                }
            }
            else {
                frag.kind = SelectionFragmentKind.CustomHandle;
                frag.customHandle = inHandle;
                if (offset < input.length) {
                    frag.error = 'Invalid characters';
                }
            }
        }
        else {
            frag.kind = SelectionFragmentKind.CustomHandle;
            frag.customHandle = '';
            frag.error = 'Invalid handle';
        }
    }
    else {
        frag.kind = SelectionFragmentKind.Identifier;
        frag.identifier = input;
    }

    return frag;
}

export function parseFrameSelector(input: string): FrameSelect {
    const result = <FrameSelect>{
        fragments: [],
    };
    for (const p of input.split('/')) {
        const tmp = parseSelectorFragment(p);
        result.fragments.push(tmp);
        if (tmp.error) {
            if (!result.errors) {
                result.errors = [tmp.error];
            }
            else {
                result.errors.push(tmp.error);
            }
        }
    }
    return result;
    // return {
    // };
}

export function parseDescSelector(input: string): DescSelect {
    return parseFrameSelector(input);
}

export function parseFramePropBinding(input: string): FramePropSelect {
    const result = <FramePropSelect>{
        fragments: [],
    };
    if (input.length >= 2 && input.charCodeAt(0) === CharacterCodes.openBrace && input.charCodeAt(input.length - 1) === CharacterCodes.closeBrace) {
        input = input.substr(1, input.length - 2);
    }
    else {
        result.errors = ['invalid property bind - missing closing curly bracket?'];
    }
    const sl = input.split('/');

    for (const [k, p] of sl.entries()) {
        if (k === sl.length - 1 && p.length && p.charCodeAt(0) === CharacterCodes.at) {
            const openBracketPos = p.indexOf('[');
            result.propertyName = p.substr(1, openBracketPos !== -1 ? openBracketPos - 1 : p.length)
            if (openBracketPos !== -1) {
                const closeBracketPos = p.indexOf(']', openBracketPos);
                if (closeBracketPos === -1 || closeBracketPos <= p.length - 2) {
                    result.errors = ['invalid property bind - missing closing bracket?'];
                }
                else {
                    result.propertyIndex = p.substring(openBracketPos + 1, closeBracketPos);
                }
            }
            continue;
        }

        const tmp = parseSelectorFragment(p);
        result.fragments.push(tmp);
        if (tmp.error) {
            if (!result.errors) {
                result.errors = [tmp.error];
            }
            else {
                result.errors.push(tmp.error);
            }
        }
    }

    if (result.propertyName === void 0) {
        if (!result.errors) result.errors = [];
        result.errors.push('invalid bind - missing property name');
    }

    return result;
}

export function getAttrValueKind(value: string): AttrValueKind {
    if (value.length >= 1) {
        switch (value.charCodeAt(0)) {
            case CharacterCodes.hash:
                if (value.charCodeAt(1) === CharacterCodes.hash) return AttrValueKind.ConstantRacial;
                return AttrValueKind.Constant;
            case CharacterCodes.at:
                if (value.charCodeAt(1) === CharacterCodes.at) return AttrValueKind.AssetRacial;
                return AttrValueKind.Asset;
            case CharacterCodes.openBrace:
                if (value.charCodeAt(value.length - 1) !== CharacterCodes.closeBrace) break;
                return AttrValueKind.PropertyBind;
            case CharacterCodes.asterisk:
                if (value.charCodeAt(1) !== CharacterCodes.at) break;
                return AttrValueKind.PtrAsset;
        }
    }
    return AttrValueKind.Generic;
}

export interface AttrProcessedValue {
    kind: AttrValueKind;
    value: string | FramePropSelect;
}

export function parseAttrValue(value: string): AttrProcessedValue {
    const r = <AttrProcessedValue>{};
    r.kind = getAttrValueKind(value);
    switch (r.kind) {
        case AttrValueKind.Constant:
        case AttrValueKind.Asset:
            r.value = value.substr(1);
            break;
        case AttrValueKind.ConstantRacial:
        case AttrValueKind.AssetRacial:
        case AttrValueKind.PtrAsset:
            r.value = value.substr(2);
            break;
        case AttrValueKind.PropertyBind:
            r.value = parseFramePropBinding(value);
            break;
        default:
            r.value = value;
            break;
    }
    return r;
}