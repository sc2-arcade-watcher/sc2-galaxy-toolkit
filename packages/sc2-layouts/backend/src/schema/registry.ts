import * as path from 'path';
import * as fs from 'fs-extra';
import * as sch from './base';
import { readSchemaModel, sraw, SRawEntries } from './reader';
import { readMdStorage, MdFileStorage, getMdFilenameOfType, mdContentToDef } from './localization';
import { globify } from '../common';

export class DefinitionMap<T> extends Map<string, T> {
    mustGet(key: string): T {
        const r = this.get(key);
        if (r === void 0) throw new Error(`Element definition "${key}" doesn't exist`);
        return r;
    }
}

export interface RegistryCatalog {
    simpleType: DefinitionMap<sch.SimpleType>;
    complexType: DefinitionMap<sch.ComplexType>;
    element: DefinitionMap<sch.ElementDef>;
    frameClass: DefinitionMap<sch.FrameClass>;
    frameType: DefinitionMap<sch.FrameType>;
}

type NamedPartial<T> = Partial<T> & {
    name: string;
};

function createSimpleType(opts: NamedPartial<sch.SimpleType>): sch.SimpleType {
    return Object.assign({
        smKind: sch.ModelKind.SimpleType,
        flags: 0,
        builtinType: sch.BuiltinTypeKind.Unknown,
        kind: sch.SimpleTypeKind.Default,
        data: sch.SimpleTypeData.String,
    }, opts);
}

function createComplexType(opts: NamedPartial<sch.ComplexType>): sch.ComplexType {
    return Object.assign<sch.ComplexType, NamedPartial<sch.ComplexType>>({
        smKind: sch.ModelKind.ComplexType,
        name: void 0,
        mpKind: sch.MappedComplexKind.Unknown,
        flags: 0,
        attributes: new Map(),
        struct: new Map(),
        indeterminateAttributes: new Map(),
        inheritance: {
            from: new Map(),
            attrs: new Map(),
            elements: new Map(),
        },
        origin: {
            attrs: new Set(),
            elements: new Set(),
        },
    }, opts);
}

function createElementDef(opts: NamedPartial<sch.ElementDef>): sch.ElementDef {
    return Object.assign<sch.ElementDef, NamedPartial<sch.ElementDef>>({
        smKind: sch.ModelKind.Element,
        name: void 0,
        type: void 0,
        flags: 0,
        nodeKind: sch.ElementDefKind.Unknown,
    }, opts);
}

function initializeRegistry(sdata: SchemaData): RegistryCatalog {
    const indexedRawEntries = {
        simpleType: new DefinitionMap<sraw.SimpleType>(),
        complexType: new DefinitionMap<sraw.ComplexType>(),
        element: new DefinitionMap<sraw.ElementType>(),
        frameClass: new DefinitionMap<sraw.FrameClass>(),
        frameType: new DefinitionMap<sraw.FrameType>(),
    };
    for (const item of sdata.dEntries) {
        indexedRawEntries[item.entryType].set(item.name, <any>item);
    }

    const registry: RegistryCatalog = {
        simpleType: new DefinitionMap<sch.SimpleType>(),
        complexType: new DefinitionMap<sch.ComplexType>(),
        element: new DefinitionMap<sch.ElementDef>(),
        frameClass: new DefinitionMap<sch.FrameClass>(),
        frameType: new DefinitionMap<sch.FrameType>(),
    };

    function applyLocalizationText(cType: sch.AbstractModel) {
        switch (cType.smKind) {
            case sch.ModelKind.SimpleType:
            case sch.ModelKind.ComplexType:
            {
                if ((<sch.SimpleType | sch.ComplexType>cType).flags & sch.CommonTypeFlags.Virtual) {
                    return;
                }
                break;
            }
        }

        const mContent = sdata.mdStorage[getMdFilenameOfType(cType)];
        if (!mContent) return;

        mdContentToDef(cType, mContent);
    }

    function addToRegistry<T extends sch.AbstractModel>(mKind: sch.ModelKind, obj: sch.AbstractModel) {
        if (sdata.mdStorage) {
            applyLocalizationText(obj);
        }
        registry[mKind].set(obj.name, <any>obj);
        return <T>obj;
    }

    function extendComplexType(target: sch.ComplexType, src: sch.ComplexType) {
        target.inheritance.from.set(src.name, src);
        for (const [extAttrName, extAttrType] of src.attributes) {
            target.attributes.set(extAttrName, extAttrType);
            target.inheritance.attrs.set(extAttrType, src);
        }
        for (const [extStructName, extStructType] of src.struct) {
            target.struct.set(extStructName, extStructType);
            target.inheritance.elements.set(extStructType, src);
        }
    }

    // ===========================

    function setupSimpleType(sType: sraw.SimpleType) {
        const objSimpleType = createSimpleType({
            name: sType.name,
        });
        const builtinId: sch.BuiltinTypeKind = (<any>sch).BuiltinTypeKind[sType.name.split(':')[0]];
        if (builtinId) {
            objSimpleType.builtinType = builtinId;
        }
        // TODO:
        // if (def.data) {
        //     rt.data = matchEnum(sch.SimpleTypeData, def.data);
        // }
        objSimpleType.internalType = sType.internalType;
        if (sType.pattern) {
            objSimpleType.patterns = sType.pattern.map(def => new RegExp(def.value));
            objSimpleType.kind = sch.SimpleTypeKind.Pattern;
        }
        if (sType.enumeration) {
            objSimpleType.emap = new Map();
            sType.enumeration.forEach(def => {
                objSimpleType.emap.set(def.value.toLowerCase(), {
                    name: def.value,
                });
            });
            if (sType.kind === sraw.ESimpleTypeKind.flags) objSimpleType.kind = sch.SimpleTypeKind.Flags;
            else objSimpleType.kind = sch.SimpleTypeKind.Enumaration;
        }
        if (sType.union) {
            objSimpleType.union = sType.union.map(def => registry.simpleType.mustGet(def.value));
            objSimpleType.kind = sch.SimpleTypeKind.Union;
            if (!objSimpleType.builtinType) {
                const r = objSimpleType.union.find(def => def.builtinType !== sch.BuiltinTypeKind.Unknown);
                if (r) objSimpleType.builtinType = r.builtinType;
            }
        }
        if (sType.flag) {
            for (const fl of sType.flag) {
                switch (fl.name) {
                    case 'Virtual': {
                        objSimpleType.flags |= sch.CommonTypeFlags.Virtual;
                        break;
                    }

                    case 'Nullable': {
                        objSimpleType.flags |= sch.SimpleTypeFlags.Nullable;
                        break;
                    }
                }
            }
        }

        return addToRegistry(sch.ModelKind.SimpleType, objSimpleType);
    }

    // ===========================

    function setupFieldType(prop: sraw.FrameClassProperty) {
        if (!prop.elementType) {
            prop.elementType = `Field:${prop.valueType}`;
            if (!registry.complexType.has(prop.elementType)) {
                const ctype: sch.ComplexType = createComplexType({
                    name: prop.elementType,
                    flags: sch.CommonTypeFlags.Virtual,
                });
                ctype.attributes.set('val', <sch.Attribute>{
                    name: 'val',
                    type: registry.simpleType.mustGet(prop.valueType),
                    required: true,
                });
                addToRegistry(sch.ModelKind.ComplexType, ctype);
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

            if (!registry.complexType.has(prop.elementType)) {
                const ctype = createComplexType({
                    name: prop.elementType,
                    flags: sch.CommonTypeFlags.Virtual,
                });
                extendComplexType(ctype, registry.complexType.mustGet(cpElementType));
                ctype.attributes.set(prop.tableKey, <sch.Attribute>{
                    name: prop.tableKey,
                    type: registry.simpleType.mustGet('Uint8'),
                    required: false,
                });
                addToRegistry(sch.ModelKind.ComplexType, ctype);
            }
        }
        return registry.complexType.mustGet(prop.elementType);
    }

    // ===========================

    function setupComplexType(item: sraw.ComplexType) {
        const ct = createComplexType({
            name: item.name,
        });
        const mappedKind: sch.MappedComplexKind = (<any>sch).MappedComplexKind[item.name];
        if (mappedKind) {
            ct.mpKind = mappedKind;
        }

        if (item.extend) {
            for (const extension of item.extend) {
                extendComplexType(ct, registry.complexType.mustGet(extension.value));
            }
        }

        for (const attr of item.attribute) {
            const scAttr = <sch.Attribute>{
                name: attr.name,
                type: registry.simpleType.mustGet(attr.type),
                required: (attr.use && attr.use === 'required') ? true : false,
                default: attr.default,
            };
            ct.attributes.set(attr.name.toLowerCase(), scAttr);
            ct.origin.attrs.add(scAttr);
        }

        for (const currImAttr of item.indeterminateAttribute) {
            ct.indeterminateAttributes.set(currImAttr.key, {
                key: registry.simpleType.mustGet(currImAttr.key),
                value: registry.simpleType.mustGet(currImAttr.value),
            });
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

        for (let el of item.element) {
            let scEl: sch.ElementDef;
            if ((<sraw.ElementRef>el).ref) {
                el = (<sraw.ElementRef>el);
                scEl = registry.element.mustGet(el.ref);
            }
            else {
                el = <sraw.ElementType>el;
                scEl = processElement(el);
            }
            ct.struct.set(scEl.name, scEl);
            ct.origin.elements.add(scEl);
        }

        return addToRegistry(sch.ModelKind.ComplexType, ct);
    }

    function processElement(el: sraw.ElementType) {
        let elComplexType: sch.ComplexType;
        if (el.type) {
            elComplexType = registry.complexType.mustGet(el.type);
        }
        else if (el.simpleType) {
            elComplexType = setupFieldType({
                name: el.name,
                valueType: el.simpleType,
                table: el.table,
            });
        }
        else {
            throw new Error(`type not specified: "${JSON.stringify(el)}"`);
        }

        const scEl: sch.ElementDef = createElementDef({
            name: el.name,
            type: elComplexType,
        });

        function createAltdesc(rawAlt: sraw.AltType) {
            const altDesc: sch.AlternationDesc = {
                matchKind: {
                    [sraw.EAltMatch.attrValue]: sch.AlternativeMatchKind.AttrValue,
                    [sraw.EAltMatch.expression]: sch.AlternativeMatchKind.Expression,
                }[rawAlt.match],
                attributeName: rawAlt.attributeName,
                icase: rawAlt.icase,
                statements: new Map(),
            };
            for (const stmt of rawAlt.statement) {
                const altStmtDesc: sch.AlternationStatementDesc = {
                    type: registry.complexType.mustGet(stmt.type),
                };
                altDesc.statements.set(stmt.test, altStmtDesc);
                if (stmt.alternative) {
                    altStmtDesc.altType = createAltdesc(stmt.alternative);
                }
            }
            return altDesc;
        }

        if (el.alternative) {
            scEl.flags |= sch.ElementDefFlags.TypeAlternation;
            scEl.altType = createAltdesc(el.alternative);
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
                break;
        }

        return scEl;
    }

    function setupElement(el: sraw.ElementType) {
        return addToRegistry(sch.ModelKind.Element, processElement(el));
    }

    // ===========================

    function getOrSetupFrameClass(clsName: string) {
        let fcls = registry.frameClass.get(clsName);
        if (!fcls) {
            fcls = setupFrameClass(indexedRawEntries.frameClass.mustGet(clsName));
        }
        return fcls;
    }

    function setupFrameClass(sFrameClass: sraw.FrameClass) {
        if (registry.frameClass.has(sFrameClass.name)) return;

        const objFrameClass: sch.FrameClass = {
            smKind: sch.ModelKind.FrameClass,
            name: sFrameClass.name,
            cparent: sFrameClass.parent ? getOrSetupFrameClass(sFrameClass.parent) : void 0,
            properties: new Map<string, sch.FrameProperty>(),
        };

        for (const spProp of sFrameClass.property) {
            const elDef = createElementDef({
                nodeKind: sch.ElementDefKind.FrameProperty,
                name: spProp.name,
                type: setupFieldType(spProp),
            });

            const scProperty: sch.FrameProperty = {
                name: spProp.name,
                etype: elDef,
                fclass: objFrameClass,
                isReadonly: spProp.readonly,
                isTable: spProp.table,
                tableKey: (spProp.table && !spProp.tableKey) ? 'index' : spProp.tableKey,
            };
            objFrameClass.properties.set(spProp.name, scProperty);
        }

        return addToRegistry<sch.FrameClass>(sch.ModelKind.FrameClass, objFrameClass);
    }

    // ===========================

    function setupFrameType(sFrameType: sraw.FrameType) {
        const objFrameType: sch.FrameType = {
            smKind: sch.ModelKind.FrameType,
            name: sFrameType.name,
            blizzOnly: sFrameType.blizzOnly,
            fclasses: new Map<string, sch.FrameClass>(),
            fprops: new Map<string, sch.FrameProperty>(),
            complexType: void 0,
            hookups: new Map(),
        };

        const objComplexType = createComplexType({
            name: sFrameType.name,
            flags: sch.CommonTypeFlags.Virtual,
        });

        objFrameType.complexType = objComplexType;

        let scFrameClass = registry.frameClass.mustGet(sFrameType.classType);
        while (scFrameClass) {
            objFrameType.fclasses.set(scFrameClass.name, scFrameClass);
            for (const scProperty of scFrameClass.properties.values()) {
                objFrameType.fprops.set(scProperty.name, scProperty);
                objComplexType.struct.set(scProperty.etype.name, scProperty.etype);
            }
            scFrameClass = scFrameClass.cparent;
        }

        for (const sHookup of sFrameType.hookup) {
            objFrameType.hookups.set(sHookup.path, {
                path: sHookup.path,
                fClass: registry.frameClass.mustGet(sHookup.class),
                required: sHookup.required,
            });
        }

        return addToRegistry(sch.ModelKind.FrameType, objFrameType);
    }

    // ===========================

    function populateFrameTypeList() {
        registry.complexType.mustGet('Frame');

        const fmtElement = registry.complexType.mustGet('CDesc').struct.get('Frame');
        fmtElement.altType = {
            matchKind: sch.AlternativeMatchKind.AttrValue,
            attributeName: 'type',
            icase: false,
            statements: new Map(),
        };
        fmtElement.flags |= sch.ElementDefFlags.TypeAlternation;

        const fmtEnum = registry.simpleType.mustGet('EFrameType');
        fmtEnum.flags |= sch.CommonTypeFlags.Virtual;
        fmtEnum.kind = sch.SimpleTypeKind.Enumaration;
        fmtEnum.emap = new Map();

        for (const itemFType of registry.frameType.values()) {
            fmtEnum.emap.set(itemFType.name.toLowerCase(), {
                name: itemFType.name,
            });
            fmtElement.altType.statements.set(itemFType.name, { type: itemFType.complexType });

            extendComplexType(itemFType.complexType, registry.complexType.mustGet('Frame'));
            extendComplexType(itemFType.complexType, registry.complexType.mustGet('CFrameDesc'));
            const rawFrameType = indexedRawEntries.frameType.mustGet(itemFType.complexType.name);
            if (rawFrameType.descType) {
                itemFType.customDesc = registry.complexType.mustGet(rawFrameType.descType);
                extendComplexType(itemFType.complexType, itemFType.customDesc);
            }
        }
        // use CFrame as default (in case of missmatched type)
        for (const [extStructName, extStructType] of registry.frameType.mustGet('Frame').complexType.struct) {
            fmtElement.type.struct.set(extStructName, extStructType);
        }
    }

    // ===========================

    for (const item of sdata.dEntries) {
        switch (item.entryType) {
            case sch.ModelKind.SimpleType:
            {
                setupSimpleType(<sraw.SimpleType>item);
                break;
            }
            case sch.ModelKind.ComplexType:
            {
                setupComplexType(<sraw.ComplexType>item);
                break;
            }
            case sch.ModelKind.Element:
            {
                setupElement(<sraw.ElementType>item);
                break;
            }
            case sch.ModelKind.FrameClass:
            {
                setupFrameClass(<sraw.FrameClass>item);
                break;
            }
            case sch.ModelKind.FrameType:
            {
                setupFrameType(<sraw.FrameType>item);
                break;
            }
            default:
            {
                throw new Error(`Unknown element "${item}"`);
                continue;
            }
        }
    }
    populateFrameTypeList();

    return registry;
}

export class SchemaRegistryBrowser implements sch.SchemaRegistry {
    readonly fileRootType: sch.ComplexType;
    readonly frameClassProps = new Map<string, sch.FrameProperty[]>();
    readonly frameTypes = new Map<string, sch.FrameType>();

    private mapFrameProperty = new Map<sch.ElementDef, sch.FrameProperty>();
    private mapFrameType = new Map<sch.ComplexType, sch.FrameType>();

    constructor(public readonly catalog: RegistryCatalog) {
        this.fileRootType = this.catalog.complexType.mustGet('CFileDesc');
        this.frameTypes = this.catalog.frameType;

        for (const fClass of this.catalog.frameClass.values()) {
            for (const fProp of fClass.properties.values()) {
                this.mapFrameProperty.set(fProp.etype, fProp);
                let tmpl = this.frameClassProps.get(fProp.name.toLowerCase());
                if (!tmpl) {
                    tmpl = [];
                    this.frameClassProps.set(fProp.name.toLowerCase(), tmpl);
                }
                tmpl.push(fProp);
            }
        }

        for (const fType of this.catalog.frameType.values()) {
            this.mapFrameType.set(fType.complexType, fType);
        }
    }

    getFrameType(scComplexType: sch.ComplexType): sch.FrameType {
        return this.mapFrameType.get(scComplexType);
    }

    getFrameProperty(scElementDef: sch.ElementDef): sch.FrameProperty {
        return this.mapFrameProperty.get(scElementDef);
    }

    getPropertyByName(name: string): sch.FrameProperty {
        const tmp = this.frameClassProps.get(name.toLowerCase());
        return tmp ? tmp[0] : void 0;
    }

    getFrameDescs(sFrameType: sch.FrameType): sch.ComplexType[] {
        const frameDescs: sch.ComplexType[] = [];
        function applyDesc(currDesc: sch.ComplexType) {
            frameDescs.push(currDesc);
            for (const tmpcType of currDesc.inheritance.from.values()) {
                applyDesc(tmpcType);
            }
        }
        if (sFrameType.customDesc) {
            applyDesc(sFrameType.customDesc);
        }
        return frameDescs;
    }

    // TODO: move it out of here
    isPropertyBindAllowed(scElementDef: sch.ElementDef, scComplexType: sch.ComplexType, attrName: string) {
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
                        const cprop = this.getPropertyByName(attrName);
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

    flattenSTypeEnumeration(smType: sch.SimpleType) {
        const rmap = new Map<string, sch.FlattenedEnumItem>();

        function processType(smType: sch.SimpleType) {
            if (smType.emap) {
                for (const item of smType.emap.values()) {
                    rmap.set(item.name, {
                        value: item.name,
                        label: item.label,
                        originType: smType,
                    });
                }
            }

            if (smType.union) {
                for (const childType of smType.union) {
                    processType(childType);
                }
            }
        }

        processType(smType);
        return rmap;
    }
}

export interface SchemaData {
    dEntries: SRawEntries;
    mdStorage?: MdFileStorage;
}

interface SchemaDirReadOptions {
    includeLocalization?: boolean;
}

export async function readSchemaDataDir(src: string, opts: SchemaDirReadOptions = {}): Promise<SchemaData> {
    opts = Object.assign({
        includeLocalization: true,
    }, opts);

    const sfProvider = createDefaultSchemaFileProvider(src);
    const sdata: SchemaData = {
        dEntries: await readSchemaModel(sfProvider),
    };

    if (opts.includeLocalization) {
        sdata.mdStorage = await readMdStorage(sfProvider);
    }

    return sdata;
}

export function createRegistry(sdata: SchemaData) {
    return new SchemaRegistryBrowser(initializeRegistry(sdata));
}

export async function createRegistryFromDir(src: string, opts: SchemaDirReadOptions = {}) {
    return createRegistry(await readSchemaDataDir(src, opts));
}

export function createDefaultSchemaFileProvider(schDir: string): sch.SchemaFileProvider {
    function readFile(filename: string) {
        schDir = path.resolve(schDir);
        if (!path.join(schDir, filename).startsWith(schDir)) {
            throw new Error(`Attempting to read file "${filename}" outside designated directory ${schDir}`);
        }
        return fs.readFile(path.join(schDir, filename), 'utf8');
    }

    function listDir(pattern: string) {
        return globify(pattern, {
            cwd: schDir,
            nodir: true,
        });
    }

    return {
        readFile,
        listDir,
    };
}
