import { CharacterCodes } from './scanner';

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

export const enum SelectionFragmentKind {
    Unknown,
    BuiltinHandle,
    CustomHandle,
    Identifier,
}

type AncestorArguments = 'name' | 'type' | 'oftype';

export interface SelectionFragment {
    kind: SelectionFragmentKind;
    builtinHandle?: BuiltinHandleKind;
    customHandle?: string;
    identifier?: string;
    arguments?: {
        name?: string;
        type?: string;
        oftype?: string;
    };
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

function parseSelectorFragment(input: string): SelectionFragment {
    const frag = <SelectionFragment>{};

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
                    // TODO: parse arguments
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
        result.errors = ['invalid property bind'];
    }
    for (const p of input.split('/')) {
        if (p.length && p.charCodeAt(0) === CharacterCodes.at) {
            const openBracketPos = p.indexOf('[');
            result.propertyName = p.substr(1, openBracketPos !== -1 ? openBracketPos - 1 : p.length)
            if (openBracketPos !== -1) {
                const closeBracketPos = p.indexOf(']', openBracketPos);
                if (closeBracketPos === -1 || closeBracketPos <= p.length - 2) {
                    result.errors = ['invalid property bind'];
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
    return result;
}