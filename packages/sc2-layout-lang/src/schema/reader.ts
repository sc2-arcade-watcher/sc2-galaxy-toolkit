import * as xmljs from 'xml-js';
import * as sch from './base';

/**
 * Raw structures
 */
export namespace sraw {
    export type Definition = {
    };

    export type NamedDefinition = Definition & {
        entryType: sch.ModelKind;
        name: string;
    };

    export enum ESimpleTypeKind {
        enum,
        flags,
    }

    export type SimpleType = NamedDefinition & {
        data?: string;
        kind?: ESimpleTypeKind;
        internalType?: string;
        pattern?: {
            value: string;
        }[];
        enumeration?: {
            value: string;
        }[];
        union?: {
            value: string;
        }[];
        flag?: {
            name: string;
            value: boolean;
        }[];
    };

    export enum EUseAttr {
        required,
        optional,
    }

    export type ComplexType = NamedDefinition & {
        extend?: {
            value: string;
        }[];
        attribute?: {
            name: string;
            type: string;
            use?: keyof typeof EUseAttr;
            default?: string;
        }[];
        indeterminateAttribute: {
            key: string;
            value: string;
        }[],
        element?: (ElementType | ElementRef)[];
        flag?: {
            name: string;
            value: boolean;
        }[];
    };

    export type ElementRef = {
        ref: string;
    };

    export enum EAltMatch {
        attrValue,
        expression,
    }

    export type AltStatement = {
        test: string;
        type: string;
        alternative?: AltType;
    };

    export type AltType = {
        match: EAltMatch;
        attributeName?: string;
        icase?: boolean;
        statement: AltStatement[];
    };

    export type ElementType = NamedDefinition & {
        simpleType?: string;
        table?: boolean;
        type?: string;
        alternative?: AltType;
    };

    export type FrameClassProperty = {
        name: string,
        table?: boolean;
        tableKey?: 'index' | string;
        elementType?: string;
        valueType?: string;
        readonly?: boolean;
    };

    export type FrameClass = NamedDefinition & {
        parent?: string;
        property: FrameClassProperty[];
    };

    export type FrameTypeHookup = {
        path: string;
        class: string;
        required: boolean;
    };

    export type FrameType = NamedDefinition & {
        name: string;
        descType?: string;
        classType: string;
        blizzOnly: boolean;
        hookup: FrameTypeHookup[];
    };
}

// ===========================
// -
// ===========================

function ensureCamelCase(s: string) {
    return s.substr(0, 1).toLowerCase() + s.substr(1);
}

function transformEnum<T>(en: T) {
    const cp: {[key: string]: typeof en} = {};
    for (const tkey of Object.keys(en).filter(v => typeof (en as any)[v] === 'number')) {
        cp[ensureCamelCase(tkey)] = (<any>en)[tkey];
    }
    return cp;
}

function matchEnum<T>(en: T, value: string) {
    const result = <any>transformEnum(en)[value];
    if (result === void 0) throw new Error(`${en} enum value "${value}"`);
    return result;
}

function ensureString(v: any) {
    if (typeof v !== 'string') throw new Error();
    return v;
}

const reBool = /^(true|false)$/;
function ensureBoolean(v: string) {
    if (!v.match(reBool)) {
        throw new Error();
    }
    return v === 'true' ? true : false;
}

// ===========================
// -
// ===========================

type AssignAttrParserFn = (val: any) => any;
interface AssignAttrOpts {
    attrs?: {
        [name: string]: {
            parser?: AssignAttrParserFn,
            required?: boolean;
        } | AssignAttrParserFn;
    };
}

function assignAttrs<T>(target: T, srcElement: xmljs.Element, opts?: AssignAttrOpts) {
    opts = Object.assign(<AssignAttrOpts>{
        attrs: {},
    }, opts);

    for (const atName in opts.attrs) {
        const cOpts = opts.attrs[atName];

        if (typeof cOpts === 'function') continue;

        if (cOpts.required && !srcElement.attributes[atName]) {
            throw new Error(`Missing required attribute "${atName}" in "${srcElement.name}"`);
        }
    }

    for (const atName in srcElement.attributes) {
        const cOpts = opts.attrs[atName] || {};

        let val: any = srcElement.attributes[atName];

        if (typeof cOpts === 'function') {
            val = cOpts(val);
        }
        else {
            if (cOpts.parser) {
                val = cOpts.parser(val);
            }
        }

        (<any>target)[atName] = val;
    }

    return target;
}

type AssignChildReaderFn = (target: any, el: xmljs.Element) => any;
interface AssignChildPropertyOpts extends AssignAttrOpts {
    defaults?: { [name: string]: any };
    reader?: AssignChildReaderFn;
    single?: boolean;
    props?: { [name: string]: AssignChildPropertyOpts};
}
interface AssignChildOpts {
    props?: { [name: string]: AssignChildPropertyOpts};
}

function assignChildren<T>(target: T, srcElements: xmljs.Element[], opts?: AssignChildOpts) {
    if (srcElements === void 0) return target;

    opts = Object.assign(<AssignChildOpts>{
        props: {},
    }, opts);

    for (const child of srcElements) {
        if (child.type === 'text') {
            (<any>target).text = <string>child.text;
            continue;
        }
        else if (child.type === 'cdata') {
            (<any>target).text = child.cdata;
            continue;
        }

        const cOpts = opts.props[child.name] !== void 0 ? opts.props[child.name] : {};

        let childTarget = {};
        if (cOpts.defaults) {
            childTarget = Object.assign(childTarget, cOpts.defaults);
        }

        if (
            child.attributes === void 0 &&
            child.elements !== void 0 &&
            child.elements.length === 1 &&
            (child.elements[0].type === 'text' || child.elements[0].type === 'cdata')
        ) {
            childTarget = child.elements[0].text || child.elements[0].cdata;
        }
        else {
            assignAttrs(childTarget, child, {
                attrs: cOpts.attrs || {},
            });
            assignChildren(childTarget, child.elements, {
                props: cOpts.props || {},
            });
        }

        if (cOpts.reader) {
            const readerResult = cOpts.reader(childTarget, child);
            if (readerResult !== void 0) {
                childTarget = readerResult;
            }
        }

        if (cOpts.single) {
            (<any>target)[child.name] = childTarget;
        }
        else {
            if ((<any>target)[child.name] === void 0) {
                (<any>target)[child.name] = [];
            }
            (<any>target)[child.name].push(childTarget);
        }
    }

    return target;
}

interface CreateEntityOpts<T extends object> extends AssignChildOpts, AssignAttrOpts {
    defaults?: Partial<T>;
}

function createEntity<T extends object>(el: xmljs.Element, opts?: CreateEntityOpts<T>) {
    const def = <T>{};
    if (opts.defaults) {
        Object.assign(def, opts.defaults);
    }
    assignAttrs(def, el, opts);
    assignChildren(def, el.elements, opts);
    return def;
}

function createNamedDefinition<T extends sraw.NamedDefinition>(el: xmljs.Element, entryType: sch.ModelKind, opts?: CreateEntityOpts<T>) {
    const def = <T>{
        entryType: entryType,
        name: ensureString(el.attributes.name),
    };
    if (opts.defaults) {
        Object.assign(def, opts.defaults);
    }
    assignAttrs(def, el, opts);
    assignChildren(def, el.elements, opts);
    return def;
}

// ===========================
// - Structure parser rules
// ===========================

function readSimpleType(el: xmljs.Element) {
    return createNamedDefinition<sraw.SimpleType>(el, sch.ModelKind.SimpleType, {
        attrs: {
            kind: {
                parser: (v) => matchEnum(sraw.ESimpleTypeKind, <string>v)
            },
        },
        props: {
            flag: {
                attrs: {
                    value: ensureBoolean,
                },
            },
        },
    });
}

function readComplexType(el: xmljs.Element) {
    return createNamedDefinition<sraw.ComplexType>(el, sch.ModelKind.ComplexType, {
        defaults: {
            attribute: [],
            indeterminateAttribute: [],
            element: [],
        },
        props: {
            flag: {
                attrs: {
                    value: ensureBoolean,
                },
            },
            element: {
                reader: (childTarget, childEl) => {
                    if (childEl.attributes.ref) {
                        return <sraw.ElementRef>{ ref: ensureString(childEl.attributes.ref) };
                    }
                    return readElementType(childEl);
                },
            },
        },
    });
}

function readAlternativeType(el: xmljs.Element): sraw.AltType {
    return createEntity<sraw.AltType>(el, {
        defaults: {
            attributeName: 'type',
            icase: false,
            statement: [],
        },
        attrs: {
            match: {
                required: true,
                parser: (v) => matchEnum(sraw.EAltMatch, v),
            },
            attributeName: ensureString,
            icase: ensureBoolean,
        },
        props: {
            statement: {
                attrs: {
                    test: ensureString,
                    value: ensureString,
                },
                props: {
                    alternative: {
                        reader: (target, el) => {
                            return readAlternativeType(el);
                        },
                        single: true,
                    },
                },
            },
        },
    });
}

function readElementType(el: xmljs.Element) {
    return createNamedDefinition<sraw.ElementType>(el, sch.ModelKind.Element, {
        attrs: {
            table: ensureBoolean,
        },
        props: {
            alternative: {
                reader: (target, el) => {
                    return readAlternativeType(el);
                },
                single: true,
            }
        },
    });
}

function readFrameClass(el: xmljs.Element) {
    return createNamedDefinition<sraw.FrameClass>(el, sch.ModelKind.FrameClass, {
        defaults: {
            property: [],
        },
        props: {
            property: {
                defaults: {
                    readonly: false,
                },
                attrs: {
                    table: ensureBoolean,
                    readonly: ensureBoolean,
                },
                props: {
                },
            },
        },
    });
}

function readFrameType(el: xmljs.Element) {
    return createNamedDefinition<sraw.FrameType>(el, sch.ModelKind.FrameType, {
        defaults: {
            hookup: [],
        },
        attrs: {
            blizzOnly: ensureBoolean,
        },
        props: {
            hookup: {
                attrs: {
                    required: ensureBoolean,
                },
            },
        },
    });
}

// ===========================
// - Content reader
// ===========================

type modelReadFn<T extends sraw.NamedDefinition> = (el: xmljs.Element) => T;

const structureReaders: {[type: string]: modelReadFn<sraw.NamedDefinition>} = {
    simpleType: readSimpleType,
    complexType: readComplexType,
    element: readElementType,
    frameClass: readFrameClass,
    frameType: readFrameType,
};

export type SRawEntries = sraw.NamedDefinition[];

export async function readSchemaModel(sfProvider: sch.SchemaFileProvider) {
    const entries: SRawEntries = [];

    async function readMap(el: xmljs.Element) {
        for (const child of el.elements) {
            switch (child.name) {
                case 'include':
                {
                    const incPath = ensureString(child.attributes.path);
                    await readFile(incPath);
                    break;
                }

                default:
                {
                    if (!structureReaders[child.name]) {
                        throw new Error(`Unexpected element "${child.name}"`);
                    }
                    const def = structureReaders[child.name](child);
                    entries.push(def);
                    break;
                }
            }
        }
    }

    async function readFile(fname: string) {
        const content = xmljs.xml2js(await sfProvider.readFile(fname), {
            compact: false,
            ignoreComment: true,

            cdataFn: (val) => {
                if (val.charAt(0) === '\n') {
                    const indent = val.substring(0, val.search(/[^\s]/));
                    val = val.replace(new RegExp(indent, 'g'), '\n').trim();
                }
                return val;
            }
        });

        await readMap(content.elements[0]);
    }

    await readFile('sc2layout.xml');

    return entries;
}
