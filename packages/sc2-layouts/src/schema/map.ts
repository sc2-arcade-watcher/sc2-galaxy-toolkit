import * as fs from 'fs';
import * as path from 'path';
import * as xml from 'xml2js';
import { assert } from 'chai';
import * as sch from './base';

// ===
// ===

function camelCase(s: string) {
    return s.substr(0, 1).toLowerCase() + s.substr(1);
}

function transformEnum<T>(en: T) {
    const cp: {[key: string]: typeof en} = {};
    for (const tkey of Object.keys(en).filter(v => typeof (en as any)[v] === 'number')) {
        cp[camelCase(tkey)] = (<any>en)[tkey];
    }
    return cp;
}

function matchEnum<T>(en: T, value: string) {
    const r = <any>transformEnum(en)[value];
    assert.isDefined(r, `${en} enum value "${value}"`);
    return r;
}

function deserialize($raw: any, no = {}) {
    for (const prop in $raw) {
        if (Array.isArray($raw[prop])) {
            (<any>no)[prop] = (<{}[]>$raw[prop]).map($idata => {
                if (typeof $idata === 'string') {
                    return $idata;
                }
                else {
                    return deserialize($idata);
                }
            });
        }
        else if (prop === '$') {
            Object.assign(no, $raw[prop]);
        }
    }
    return no;
}

// ===

namespace smp {
    type Definition = {
        name: string;
    };

    export type SimpleType = Definition & {
        data?: string;
        kind?: string;
        internalType?: string;
        pattern?: {
            value: string;
        }[];
        enumeration?: {
            value: string;
            label: string;
        }[];
        union?: {
            value: string;
        }[];
        flag?: {
            name: string;
            value: 'true' | 'false';
        }[];
    };

    export type ComplexType = Definition & {
        extend?: {
            value: string;
        }[];
        attribute?: {
            name: string;
            type: string;
            use?: 'required' | 'optional';
            default?: string;
            documentation?: string;
        }[];
        indeterminateAttribute: {
            key: string;
            value: string;
        }[],
        element?: {
            name: string;
            simpleType?: string;
            table?: 'true';
            type?: string;
            label?: string;
            documentation?: string;
            alternative?: {
                test: string;
                type: string;
            }[];
        }[];
        flag?: {
            name: string;
            value: 'true' | 'false';
        }[];
        label?: string;
    };

    export type MFrameClassProperty = {
        name: string,
        table?: 'true' | 'false';
        tableKey?: 'index' | string;
        elementType?: string;
        valueType?: string;
        readonly?: 'true' | 'false';
        label?: string;
        documentation?: string;
    };

    export type FrameClass = Definition & {
        parent?: string;
        property?: MFrameClassProperty[];
    };

    export type FrameType = Definition & {
        frameType: string;
        descType: string;
        classType: string;
        blizzOnly: 'true' | 'false';
    };
}

enum MDefs {
    SimpleType,
    ComplexType,
    FrameClass,
    FrameType,
}

// ===

function parseDocEl(inDoc: string[]) {
    inDoc = inDoc.map((doc: string) => {
        if (doc.charAt(0) === '\n') {
            const indent = doc.substring(1, doc.indexOf('\n', 1));
            doc = doc.replace(new RegExp('\n' + indent, 'g'), '\n').trim();
        }
        return doc;
    });
    return (<string[]>inDoc).join(`\n---\n`);
}

function readMap(schDir: string) {
    const smap = new Map<string, [MDefs, {}]>();

    const parseItem = {
        [MDefs.SimpleType]: (data: smp.SimpleType) => {
            if (typeof data.flag === 'undefined') data.flag = [];
            return data;
        },
        [MDefs.ComplexType]: (data: smp.ComplexType) => {
            if (typeof data.attribute === 'undefined') data.attribute = [];
            if (typeof data.indeterminateAttribute === 'undefined') data.indeterminateAttribute = [];
            if (typeof data.flag === 'undefined') data.flag = [];
            if (typeof data.element === 'undefined') data.element = [];
            for (const el of data.element) {
                if (typeof el.label !== 'undefined' && Array.isArray(el.label)) {
                    el.label = parseDocEl(el.label);
                }
                if (typeof el.documentation !== 'undefined' && Array.isArray(el.documentation)) {
                    el.documentation = parseDocEl(el.documentation);
                }

                if (typeof el.alternative !== 'undefined') {
                    for (const alt of el.alternative) {
                    }
                }
            }
            for (const attr of data.attribute) {
                if (typeof attr.documentation !== 'undefined' && Array.isArray(attr.documentation)) {
                    attr.documentation = parseDocEl(attr.documentation);
                }
            }

            if (typeof data.label !== 'undefined' && Array.isArray(data.label)) {
                data.label = parseDocEl(data.label);
            }

            return data;
        },
        [MDefs.FrameClass]: (data: smp.FrameClass) => {
            if (typeof data.property === 'undefined') data.property = [];
            for (const prop of data.property) {
                assert.isNotEmpty(prop.name);

                if (typeof prop.documentation !== 'undefined' && Array.isArray(prop.documentation)) {
                    prop.documentation = parseDocEl(prop.documentation);
                }

                if (typeof prop.label !== 'undefined' && Array.isArray(prop.label)) {
                    prop.label = parseDocEl(prop.label);
                }

                if (!prop.elementType) {
                    assert.isNotEmpty(prop.valueType);
                }
            }
            return data;
        },
        [MDefs.FrameType]: (data: smp.FrameType) => {
            return data;
        },
    };

    function loadFile(fname: string) {
        xml.parseString(fs.readFileSync(fname, 'utf8'), {}, (err, result) => {
            // console.log(err);
            // console.log(result.map);
            for (const ecat in result.map) {
                const mtdefNorm: keyof typeof MDefs = <any>(ecat.substr(0, 1).toUpperCase() + ecat.substr(1));
                const mtdefNormN = MDefs[mtdefNorm];
                // assert.isDefined(MDefs[mtdefNorm]);
                if (typeof mtdefNormN === 'undefined') continue;
                for (const eidx in result.map[ecat]) {
                    // const ename = result.map[ecat][eidx].$.name;
                    const eitem = deserialize(result.map[ecat][eidx]);
                    assert.isNotEmpty((<any>eitem).name);
                    const pitem = (<any>parseItem[mtdefNormN])(<any>eitem);
                    // sdefs[mtdefNorm].set(pitem.name, pitem);
                    assert.isUndefined(smap.get(pitem.name));
                    smap.set(pitem.name, [mtdefNormN, pitem]);
                }
            }
        });
    }

    loadFile(path.join(schDir, 'type.xml'));
    loadFile(path.join(schDir, 'enum.xml'));
    loadFile(path.join(schDir, 'field.xml'));
    loadFile(path.join(schDir, 'frame_class.xml'));
    loadFile(path.join(schDir, 'frame_type.xml'));
    loadFile(path.join(schDir, 'stategroup.xml'));
    loadFile(path.join(schDir, 'animation.xml'));
    loadFile(path.join(schDir, 'struct.xml'));

    return smap;
}

export function generateSchema(schDir: string): sch.SchemaRegistry {
    const entries = new Map<string, sch.SModel>();
    const mapFrameClass = new Map<sch.ComplexType, sch.FrameClass>();
    const mapFrameProperty = new Map<sch.ElementDef, sch.FrameProperty>();
    const mapFramePropName = new Map<string, sch.FrameProperty[]>();
    const mapFrameType = new Map<sch.ComplexType, sch.FrameType>();
    const smap = readMap(schDir);

    function resolveSchType<T extends sch.SModel>(name: string) {
        const r = entries.get(name) as T;
        assert.isDefined(r, `Couldn't resolve type "${name}"`);
        return r;
    }

    function extendComplexType(target: sch.ComplexType, src: sch.ComplexType) {
        for (const [extAttrName, extAttrType] of src.attributes) {
            target.attributes.set(extAttrName, extAttrType);
        }
        for (const [extStructName, extStructType] of src.struct) {
            target.struct.set(extStructName, extStructType);
        }
    }

    function processSM(fn: (item: any, mtKind: MDefs) => void, restrictMT?: MDefs | MDefs[]) {
        if (typeof restrictMT !== 'undefined' && !Array.isArray(restrictMT)) {
            restrictMT = [restrictMT];
        }
        for (const [emName, emItem] of smap) {
            if (typeof restrictMT !== 'undefined' && (<MDefs[]>restrictMT).indexOf(emItem[0]) === -1) continue;
            fn(emItem[1], emItem[0]);
        }
    }

    function createFieldType(prop: smp.MFrameClassProperty) {
        if (!prop.elementType) {
            prop.elementType = `Field:${prop.valueType}`;
            if (!entries.has(prop.elementType)) {
                const ctype: sch.ComplexType = {
                    name: prop.elementType,
                    mpKind: sch.MappedComplexKind.Unknown,
                    flags: 0,
                    attributes: new Map(),
                    struct: new Map(),
                    indeterminateAttributes: new Map(),
                };
                ctype.attributes.set('val', <sch.Attribute>{
                    name: 'val',
                    type: resolveSchType(prop.valueType),
                    required: true,
                });
                entries.set(ctype.name, ctype);
            }
        }
        if (prop.table) {
            const cpElementType = prop.elementType;

            if (!prop.tableKey) {
                prop.tableKey = 'index';
                prop.elementType = `Table:${prop.elementType}`;
            }
            else {
                prop.elementType = prop.tableKey.substr(0, 1).toUpperCase() + prop.tableKey.substr(1) + `Table:${prop.elementType}`;
            }

            if (!entries.has(prop.elementType)) {
                const ctype: sch.ComplexType = {
                    name: prop.elementType,
                    mpKind: sch.MappedComplexKind.Unknown,
                    flags: 0,
                    attributes: new Map(),
                    struct: new Map(),
                    indeterminateAttributes: new Map(),
                };
                extendComplexType(ctype, <sch.ComplexType>entries.get(cpElementType));
                ctype.attributes.set(prop.tableKey, <sch.Attribute>{
                    name: prop.tableKey,
                    type: resolveSchType('Uint8'),
                    required: false,
                });
                entries.set(ctype.name, ctype);
            }
        }
        return <sch.ComplexType>entries.get(prop.elementType);
    }

    // ===
    // - Simple type
    // ===
    processSM((item: smp.SimpleType) => {
        const rt = <sch.SimpleType>{
            name: item.name,
            flags: 0,
            builtinType: sch.BuiltinTypeKind.Unknown,
            kind: sch.SimpleTypeKind.Default,
            data: sch.SimpleTypeData.String,
        };
        const builtinId: sch.BuiltinTypeKind = (<any>sch).BuiltinTypeKind[item.name.split(':')[0]];
        if (builtinId) {
            rt.builtinType = builtinId;
        }
        if (item.data) {
            rt.data = matchEnum(sch.SimpleTypeData, item.data);
        }
        if (item.internalType) {
            rt.internalType = item.internalType;
        }
        if (item.pattern) {
            rt.patterns = item.pattern.map(item => new RegExp(item.value));
            rt.kind = sch.SimpleTypeKind.Pattern;
        }
        if (item.enumeration) {
            rt.evalues = item.enumeration.map(item => item.value);
            rt.emap = new Map();
            item.enumeration.forEach(item => {rt.emap.set(item.value.toLowerCase(), {name: item.value, label: item.label}); });
            rt.kind = sch.SimpleTypeKind.Enumaration;
            if (item.kind === 'flags') rt.kind = sch.SimpleTypeKind.Flags;
        }
        if (item.union) {
            rt.union = item.union.map(item => resolveSchType<sch.SimpleType>(item.value));
            rt.kind = sch.SimpleTypeKind.Union;
            if (!rt.builtinType) {
                const r = rt.union.find(item => item.builtinType !== sch.BuiltinTypeKind.Unknown);
                if (r) rt.builtinType = r.builtinType;
            }
        }
        if (item.flag) {
            for (const fl of item.flag) {
                switch (fl.name) {
                    case 'Nullable':
                        rt.flags |= sch.SimpleTypeFlags.Nullable;
                        break;
                }
            }
        }
        entries.set(rt.name, rt);
    }, MDefs.SimpleType);


    // ===
    // - Complex type
    // ===
    processSM((item: smp.ComplexType) => {
        const ct: sch.ComplexType = {
            name: item.name,
            mpKind: sch.MappedComplexKind.Unknown,
            flags: 0,
            attributes: new Map(),
            struct: new Map(),
            indeterminateAttributes: new Map(),
        };
        const mappedKind: sch.MappedComplexKind = (<any>sch).MappedComplexKind[item.name];
        if (mappedKind) {
            ct.mpKind = mappedKind;
        }
        if (item.extend) {
            for (const extension of item.extend) {
                assert.isNotEmpty(extension.value);
                extendComplexType(ct, resolveSchType<sch.ComplexType>(extension.value));
            }
        }
        if (item.attribute) {
            for (const attr of item.attribute) {
                assert.isNotEmpty(attr.name);
                assert.isNotEmpty(attr.type);

                const scAttr = <sch.Attribute>{
                    name: attr.name,
                    type: resolveSchType<sch.SimpleType>(attr.type),
                    required: (attr.use && attr.use === 'required') ? true : false,
                    default: attr.default,
                };
                if (attr.documentation) {
                    scAttr.documentation = attr.documentation;
                }
                ct.attributes.set(attr.name.toLowerCase(), scAttr);
            }
        }
        for (const currImAttr of item.indeterminateAttribute) {
            assert.isNotEmpty(currImAttr.key);
            assert.isNotEmpty(currImAttr.value);
            ct.indeterminateAttributes.set(currImAttr.key, {
                key: resolveSchType(currImAttr.key),
                value: resolveSchType(currImAttr.value),
            });
        }
        if (item.label) {
            ct.label = item.label;
        }
        if (item.element) {
            for (const el of item.element) {
                assert.isNotEmpty(el.name);
                let elComplexType: sch.ComplexType;
                if (el.type) {
                    elComplexType = resolveSchType<sch.ComplexType>(el.type);
                }
                else if (el.simpleType) {
                    elComplexType = createFieldType({
                        name: el.name,
                        valueType: el.simpleType,
                        table: el.table,
                    });
                }
                else {
                    throw new Error('type not specified');
                }

                const scEl = <sch.ElementDef>{
                    flags: 0,
                    name: el.name,
                    type: elComplexType,
                };

                if (el.label) scEl.label = el.label;
                if (el.documentation) scEl.documentation = el.documentation;

                if (el.alternative) {
                    scEl.flags |= sch.ElementDefFlags.TypeAlternation;
                    scEl.alternateTypes = new Map<string, sch.ComplexType>();
                    for (const alt of el.alternative) {
                        scEl.alternateTypes.set(alt.test, resolveSchType<sch.ComplexType>(alt.type));
                    }
                }

                switch (el.name) {
                    case 'Desc': scEl.nodeKind = sch.ElementDefKind.Desc; break;
                    case 'RequiredDefines': scEl.nodeKind = sch.ElementDefKind.RequiredDefines; break;
                    case 'DescFlags': scEl.nodeKind = sch.ElementDefKind.DescFlags; break;
                    case 'Include': scEl.nodeKind = sch.ElementDefKind.Include; break;
                    case 'Constant': scEl.nodeKind = sch.ElementDefKind.Constant; break;
                    case 'Frame': scEl.nodeKind = sch.ElementDefKind.Frame; break;
                    case 'Animation': scEl.nodeKind = sch.ElementDefKind.Animation; break;
                    case 'Event': scEl.nodeKind = sch.ElementDefKind.AnimationEvent; break;
                    case 'Controller': scEl.nodeKind = sch.ElementDefKind.AnimationController; break;
                    case 'Key': scEl.nodeKind = sch.ElementDefKind.AnimationControllerKey; break;
                    case 'StateGroup': scEl.nodeKind = sch.ElementDefKind.StateGroup; break;
                    case 'DefaultState': scEl.nodeKind = sch.ElementDefKind.StateGroupDefaultState; break;
                    case 'State': scEl.nodeKind = sch.ElementDefKind.StateGroupState; break;
                    case 'When': scEl.nodeKind = sch.ElementDefKind.StateGroupStateCondition; break;
                    case 'Action': scEl.nodeKind = sch.ElementDefKind.StateGroupStateAction; break;
                    default:
                        scEl.nodeKind = sch.ElementDefKind.Unknown;
                        // console.error(`${ct.name} -> ${el.name}`);
                        break;
                }

                ct.struct.set(el.name, scEl);
            }
        }
        if (item.flag) {
            for (const fl of item.flag) {
                switch (fl.name) {
                    case 'AllowExtraAttrs':
                        ct.flags |= sch.ComplexTypeFlags.AllowExtraAttrs;
                        break;
                }
            }
        }
        entries.set(ct.name, ct);
    }, MDefs.ComplexType);


    // ===
    // - Frame class
    // ===
    processSM((item: smp.FrameClass) => {
        const ct: sch.ComplexType = {
            name: item.name,
            mpKind: sch.MappedComplexKind.Unknown,
            flags: 0,
            attributes: new Map(),
            struct: new Map(),
            indeterminateAttributes: new Map(),
        };

        for (const prop of item.property) {
            createFieldType(prop);

            const cel = <sch.ElementDef>{
                flags: 0,
                nodeKind: sch.ElementDefKind.FrameProperty,
                name: prop.name,
                type: resolveSchType<sch.ComplexType>(prop.elementType),
            };
            if (prop.label) {
                cel.label = prop.label;
            }
            if (prop.documentation) {
                cel.documentation = prop.documentation;
            }
            ct.struct.set(prop.name, cel);
        }

        entries.set(ct.name, ct);
    }, MDefs.FrameClass);


    // ===
    // - Frame type
    // ===
    processSM((item: smp.FrameType) => {
        const ct: sch.ComplexType = {
            name: item.name,
            mpKind: sch.MappedComplexKind.Unknown,
            flags: 0,
            attributes: new Map(),
            struct: new Map(),
            indeterminateAttributes: new Map(),
        };

        extendComplexType(ct, resolveSchType('Frame'));

        let pclassType = item.classType;
        while (pclassType) {
            extendComplexType(ct, resolveSchType(pclassType));
            const mpClass = <smp.FrameClass>smap.get(pclassType)[1];
            pclassType = mpClass.parent;
        }

        extendComplexType(ct, resolveSchType(item.descType));

        entries.set(ct.name, ct);
    }, MDefs.FrameType);


    // ===
    // - generate lookup tables
    // ===

    function translateFrameClass(name: string): sch.FrameClass {
        const spFrameClass = <smp.FrameClass>smap.get(name)[1];
        const scComplexType = <sch.ComplexType>entries.get(spFrameClass.name);

        let scFrameClass: sch.FrameClass = mapFrameClass.get(scComplexType);
        if (scFrameClass) return scFrameClass;

        scFrameClass = <sch.FrameClass>{
            name: spFrameClass.name,
            cparent: spFrameClass.parent ? translateFrameClass(spFrameClass.parent) : void 0,
            properties: new Map<string, sch.FrameProperty>(),
        };

        for (const spProp of spFrameClass.property) {
            const scProperty = <sch.FrameProperty>{
                name: spProp.name,
                etype: scComplexType.struct.get(spProp.name),
                fclass: scFrameClass,
                isReadonly: (spProp.readonly && spProp.readonly === 'true') ? true : false,
                isConstant: (spProp.readonly && spProp.readonly === 'true') ? true : false,
                isTable: (spProp.table && spProp.table === 'true') ? true : false,
                tableKey: (spProp.table && !spProp.tableKey) ? 'index' : spProp.tableKey,
            };
            scFrameClass.properties.set(spProp.name, scProperty);
            mapFrameProperty.set(scProperty.etype, scProperty);

            let tmpl = mapFramePropName.get(scProperty.name.toLowerCase());
            if (!tmpl) {
                tmpl = [];
                mapFramePropName.set(scProperty.name.toLowerCase(), tmpl);
            }
            tmpl.push(scProperty);
        }

        mapFrameClass.set(scComplexType, scFrameClass);
        return scFrameClass;
    }
    processSM((item: smp.FrameClass) => {
        translateFrameClass(item.name);
    }, MDefs.FrameClass);

    processSM((item: smp.FrameType) => {
        const scFrameType = <sch.FrameType>{
            name: item.frameType,
            blizzOnly: (item.blizzOnly && item.blizzOnly === 'true') ? true : false,
            fclasses: new Map<string, sch.FrameClass>(),
            fprops: new Map<string, sch.FrameProperty>(),
        };

        let scFrameClass: sch.FrameClass = translateFrameClass(item.classType);
        while (scFrameClass) {
            scFrameType.fclasses.set(scFrameClass.name, scFrameClass);
            for (const scProperty of scFrameClass.properties.values()) {
                scFrameType.fprops.set(scProperty.name, scProperty);
            }
            scFrameClass = scFrameClass.cparent;
        }

        mapFrameType.set(<sch.ComplexType>entries.get(item.name), scFrameType);
    }, MDefs.FrameType);


    // ===
    // - Frame type: alt
    // ===
    const cdesc = <sch.ComplexType>entries.get('CDesc');
    const cfrmEl = cdesc.struct.get('Frame');
    const sFrameEnum = <sch.SimpleType>entries.get('EFrameType');
    sFrameEnum.kind = sch.SimpleTypeKind.Enumaration;
    sFrameEnum.evalues = [];
    sFrameEnum.emap = new Map();
    cfrmEl.flags |= sch.ElementDefFlags.TypeAlternation;
    cfrmEl.alternateTypes = new Map();
    processSM((item: smp.FrameType) => {
        cfrmEl.alternateTypes.set(item.frameType, <sch.ComplexType>entries.get(item.name));
        sFrameEnum.evalues.push(item.frameType);
        sFrameEnum.emap.set(item.frameType.toLowerCase(), {
            name: item.frameType,
            label: item.blizzOnly === 'true' ? 'Blizz restricted' : void 0,
        });
    }, MDefs.FrameType);
    // use CFrame as default - missmatched type
    for (const [extStructName, extStructType] of (<sch.ComplexType>entries.get('Frame:Frame')).struct) {
        cfrmEl.type.struct.set(extStructName, extStructType);
    }

    //
    const frameClasses = new Map<string, sch.FrameClass>();
    for (const t of mapFrameClass.values()) {
        frameClasses.set(t.name, t);
    }
    const frameTypes = new Map<string, sch.FrameType>();
    for (const t of mapFrameType.values()) {
        frameTypes.set(t.name, t);
    }

    // ===

    function getFrameType(scComplexType: sch.ComplexType): sch.FrameType {
        return mapFrameType.get(scComplexType);
    }

    function getFrameProperty(scElementDef: sch.ElementDef): sch.FrameProperty {
        return mapFrameProperty.get(scElementDef);
    }

    function getPropertyByName(name: string): sch.FrameProperty {
        const r = mapFramePropName.get(name.toLowerCase());
        return r ? r[0] : void 0;
    }

    function isPropertyBindAllowed(scElementDef: sch.ElementDef, scComplexType: sch.ComplexType, attrName: string) {
        switch (scElementDef.nodeKind) {
            case sch.ElementDefKind.FrameProperty:
            {
                if (attrName !== 'val') break;
                const tmpa = scComplexType.attributes.get(attrName);
                if (!tmpa) break;
                return tmpa.type ? true : false;
            }

            case sch.ElementDefKind.StateGroupStateCondition:
            case sch.ElementDefKind.StateGroupStateAction:
            {
                switch (scComplexType.name) {
                    case 'CFrameStateConditionProperty':
                    case 'CFrameStateSetPropertyAction':
                    {
                        const cprop = getPropertyByName(attrName);
                        if (!cprop) break;
                        try {
                            return cprop.etype.type.attributes.get('val').type ? true : false;
                        }
                        catch (e) {
                            break;
                        }
                    }
                }

                break;
            }
        }

        return false;
    }

    return {
        stypes: entries,
        fileRootType: <sch.ComplexType>entries.get('CFileDesc'),
        frameClasses: frameClasses,
        frameClassProps: mapFramePropName,
        frameTypes: frameTypes,

        getFrameType,
        getFrameProperty,
        getPropertyByName,
        isPropertyBindAllowed,
    };
}
