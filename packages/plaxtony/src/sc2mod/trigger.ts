import * as fs from 'fs';
import * as xml from 'xml2js';

export const enum ElementFlag {
    Native             = 1 << 1,
    FuncAction         = 1 << 2,
    FuncCall           = 1 << 3,
    Event              = 1 << 4,
    Template           = 1 << 5,
    PresetGenConstVar  = 1 << 6,
    PresetCustom       = 1 << 7,
    CustomScript       = 1 << 8,
    Operator           = 1 << 9,
    CustomAI           = 1 << 10,
    SubFunctions       = 1 << 11,
    AllowBreak         = 1 << 12,
    Hidden             = 1 << 13,
    NoScriptPrefix     = 1 << 14,
    Deprecated         = 1 << 15,
    Internal           = 1 << 16,
}

export class ElementReference<T extends Element> {
    private store: TriggerStore;
    id: string;
    type: typeof Element;
    library?: string;

    public constructor(container: TriggerStore) {
        this.store = container;
    }

    public link() {
        return this.type.name + '/' + this.id;
    }

    public globalLink() {
        let link = this.link();
        if (this.library) {
            link = this.library + '/' + link;
        }
        return link;
    }

    public resolve(): T | undefined {
        if (this.library) {
            const lib = this.store.getLibraries().get(this.library);
            return lib.findElementById(this.link(), null) as T;
        }
        return this.store.findElementById(this.link(), null) as T;
        // return this.container.findElementById(this.id, this.type) as T;
    }
}

export class ParameterType {
    type: string;
    gameType?: string; // when type == gamelink; e.g. Model; (may be omitted - "any")
    typeElement?: ElementReference<Preset>; // when type == preset;

    public galaxyType() {
        switch (this.type) {
            case 'gamelink':
            case 'convline':
            case 'filepath':
            case 'gameoption':
            case 'gameoptionvalue':
            case 'modelanim':
                return 'string';

            case 'control':
            case 'transmission':
            case 'portrait':
                return 'int';

            case 'preset':
                return this.typeElement.resolve().baseType;

            default:
                return this.type;
        }
    }
}
// TODO:
// <Type Value="filepath"/>
// <AssetType Value="Cutscene"/>
// -
// <Type Value="convline"/>
// -
// <Type Value="control"/>
// -
// <Type Value="gameoption"/>
// -
// <Type Value="gameoptionvalue"/>
// -
// <Type Value="modelanim"/>

export abstract class Tag {
    static prefix?: string;
    libId?: string;
    id: string;
    name?: string;

    public link() {
        return (this.libId ? this.libId + '/' : '') + (this.constructor.name + '/') + this.id;
    }

    public toString() {
        const parts: string[] = [];
        if (this.libId) {
            parts.push('lib' + this.libId);
        }
        const prefix = (<any>this.constructor).prefix;
        if (prefix) {
            parts.push(prefix);
        }
        parts.push(this.name ? this.name : this.id);
        return parts.join('_');
    }

    public textKey(kind: string) {
        const parts: string[] = [];
        parts.push(this.constructor.name);
        parts.push(kind);
        if (this.libId) {
            parts.push(['lib', this.libId, this.id].join('_'));
        }
        else {
            parts.push(this.id);
        }
        return parts.join('/');
    }
}

export abstract class Element extends Tag {
    flags: ElementFlag;
    label?: ElementReference<Label>;
    items: ElementReference<Element>[] = [];

    public toString() {
        if (this.flags & ElementFlag.Native) {
            return this.name ? this.name : this.id;
        }
        return super.toString();
    }
}

export class ParamDef extends Element {
    type: ParameterType;
    default?: ElementReference<Param>;
}

export class FunctionDef extends Element {
    static prefix = 'gf';
    parameters: ElementReference<ParamDef>[] = [];
    returnType?: ParameterType;
    scriptCode?: string;

    public getParameters() {
        return this.parameters.map((paramRef): ParamDef => {
            return paramRef.resolve() as ParamDef;
        });
    }
}

export class Preset extends Element {
    baseType: string;
    values: ElementReference<PresetValue>[] = [];
}

export class PresetValue extends Element {
    value?: string;
}

export class Param extends Element {
    functionCall?: ElementReference<FunctionCall>;
    preset?: ElementReference<PresetValue>;
    value?: string;
    valueType?: string;
    valueElement?: ElementReference<Preset>;
}

export class FunctionCall extends Element {
    functionDef: ElementReference<FunctionDef>;
}

export class Category extends Element {
};

export class Label extends Element {
    icon?: string;
    color?: string;
};

const ElementClasses = {
    ParamDef,
    FunctionDef,
    Preset,
    PresetValue,
    Param,
    FunctionCall,
    Category,
    Label,
};

// export class TriggerExplorer {
//     protected containers: ElementContainer;
// }

export abstract class ElementContainer {
    public items: ElementReference<Element>[] = [];
    protected elements: Map<string, Element> = new Map();
    protected nameMap: Map<string, Element> = new Map();

    public addElement(identifier: string, el: Element) {
        el.id = identifier;
        if (el instanceof FunctionDef) {
            this.nameMap.set(el.name, el);
        }
        this.elements.set(el.constructor.name + '/' + el.id, el);
    }

    public findElementByName(name: string): Element | undefined {
        return this.nameMap.get(name);
    }

    public findPresetValueByStr(value: string): PresetValue | undefined {
        for (const el of this.elements.values()) {
            if (!(el instanceof PresetValue)) continue;
            if (el.value && el.value == value) {
                return el;
            }
        }
        return null;
    }

    public findPresetByValue(value: PresetValue): Preset | undefined {
        for (const el of this.elements.values()) {
            if (!(el instanceof Preset)) continue;
            const belongsTo = el.values.find((localVal) => {
                return value.id === localVal.id;
            });
            if (belongsTo) {
                return el;
            }
        }
        return null;
    }

    public findElementById<T extends Element>(id: string, type?: { new(): T ;}): T | undefined {
        if (type && type.name !== 'Element') {
            id = type.name + '/' + id;
        }
        return this.elements.get(id) as T;
    }

    public getElements() {
        return <ReadonlyMap<string, Element>>this.elements;
    }
}

export class Library extends ElementContainer {
    protected id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }

    public addElement(identifier: string, el: Element) {
        el.libId = this.id;
        super.addElement(identifier, el);
    }

    public getId() {
        return this.id;
    }
}

export type LibraryContainer = Map<string, Library>;

export class TriggerStore extends ElementContainer {
    protected libraries: LibraryContainer = new Map<string, Library>();
    protected unresolvedReferences = new Map<string, ElementReference<Element>[]>();

    public addElementReference(ref: ElementReference<Element>) {
        const link = ref.globalLink();

        if (this.unresolvedReferences.has(link)) {
            const refList = this.unresolvedReferences.get(link);
            refList.push(ref);
        }
        else {
            this.unresolvedReferences.set(link, [ref]);
        }
    }

    public addLibrary(library: Library) {
        this.libraries.set(library.getId(), library);
    }

    // public findElementById<T extends Element>(elementId: string, libraryId?: string): T | undefined {
    //     if (libraryId) {
    //         return this.libraries.get(libraryId).findElementById(elementId) as T;
    //     }
    //     return super.findElementById(elementId) as T;
    // }

    public getLibraries() {
        return <ReadonlyMap<string, Library>>this.libraries;
    }
}

export class XMLReader {
    protected store: TriggerStore;

    private parseReference<T extends Element>(data: any, type: { new(): T }): ElementReference<T> {
        const ref = new ElementReference<T>(this.store);
        ref.id = data.$.Id;
        if (data.$.Library) {
            ref.library = data.$.Library;
        }
        ref.type = (ElementClasses as any)[type.name];

        this.store.addElementReference(ref);

        return ref;
    }

    private parseParam(item: any): Param {
        const element = new Param();
        if (item.FunctionCall) {
            element.functionCall = this.parseReference(item.FunctionCall[0], FunctionCall);
        }
        if (item.Preset) {
            element.preset = this.parseReference(item.Preset[0], PresetValue);
        }
        if (item.Value) {
            element.value = item.Value[0];
        }
        if (item.ValueType) {
            element.valueType = item.ValueType[0].$.Type;
            if (item.ValueGameType) {
                // item.ValueGameType[0].$.Type;
            }
        }
        if (item.ValueElement) {
            element.valueElement = this.parseReference(item.ValueElement[0], Preset);
        }
        return element;
    }

    private parseFunctionCall(item: any): FunctionCall {
        const element = new FunctionCall();
        if (item.FunctionDef) {
            // TODO: check one of the void story libraries - it doesn't have FunctionDef
            element.functionDef = this.parseReference(item.FunctionDef[0], FunctionDef);
        }
        return element;
    }

    private parseParameterType(item: any): ParameterType {
        const element = new ParameterType();
        element.type = item.Type[0].$.Value;
        if (element.type === 'gamelink' && item.GameType) {
            element.gameType = item.GameType[0].$.Value;
        }
        if (element.type === 'preset') {
            element.typeElement = this.parseReference(item.TypeElement[0], Preset);
        }
        return element;
    }

    private parseCategory(item: any) {
        const element = new Category();
        return element;
    }

    private parseLabel(item: any) {
        const element = new Label();
        if (item.Icon) {
            element.icon = item.Icon[0];
        }
        if (item.Color) {
            element.color = item.Color[0];
        }
        return element;
    }

    private parseElement(item: any): Element {
        let el: Element;

        switch (item.$.Type) {
            case 'FunctionDef':
            {
                const func = el = new FunctionDef();

                func.flags |= item.FlagNative ? ElementFlag.Native : 0;
                func.flags |= item.FlagAction ? ElementFlag.FuncAction : 0;
                func.flags |= item.FlagCall ? ElementFlag.FuncCall : 0;
                func.flags |= item.FlagEvent ? ElementFlag.Event : 0;
                func.flags |= item.Template ? ElementFlag.Template : 0;
                func.flags |= item.FlagCustomScript ? ElementFlag.CustomScript : 0;
                func.flags |= item.FlagOperator ? ElementFlag.Operator : 0;
                func.flags |= item.FlagCustomAI ? ElementFlag.CustomAI : 0;
                func.flags |= item.FlagSubFunctions ? ElementFlag.SubFunctions : 0;
                func.flags |= item.FlagAllowBreak ? ElementFlag.AllowBreak : 0;
                func.flags |= item.FlagHidden ? ElementFlag.Hidden : 0;
                func.flags |= item.FlagNoScriptPrefix ? ElementFlag.NoScriptPrefix : 0;
                func.flags |= item.Deprecated ? ElementFlag.Deprecated : 0;
                func.flags |= item.Internal ? ElementFlag.Internal : 0;

                if (item.Parameter) {
                    for (const param of item.Parameter) {
                        if (param.$.Type === 'Comment') continue;
                        func.parameters.push(this.parseReference(param, ParamDef));
                    }
                }

                if (item.ReturnType) {
                    func.returnType = this.parseParameterType(item.ReturnType[0]);
                }

                if (item.ScriptCode) {
                    func.scriptCode = item.ScriptCode[0];
                    const whitespace = func.scriptCode.match(/^\r\n(\s+)/)[1];
                    if (whitespace) {
                        func.scriptCode = func.scriptCode.trim().replace(/\r\n/g, '\n').replace(new RegExp('^' + whitespace, 'gm'), '');
                    }
                }
                break;
            }
            case 'ParamDef':
            {
                const paramDef = el = new ParamDef();
                paramDef.type = this.parseParameterType(item.ParameterType[0]);
                if (item.Default) {
                    paramDef.default = this.parseReference(item.Default[0], Param);
                }
                break;
            }
            case 'Param':
                el = this.parseParam(item);
                break;
            case 'FunctionCall':
                el = this.parseFunctionCall(item);
                break;
            case 'Preset':
            {
                const preset = el = new Preset();
                preset.flags |= item.PresetGenConstVar ? ElementFlag.PresetGenConstVar : 0;
                preset.flags |= item.PresetCustom ? ElementFlag.PresetCustom : 0;
                preset.baseType = item.BaseType[0].$.Value;
                if (item.Item) {
                    for (const val of item.Item) {
                        if (val.$.Type !== 'PresetValue') continue;
                        preset.values.push(this.parseReference(val, PresetValue));
                    }
                }
                // item.$.PresetCustom
                // item.$.PresetGenConstVar
                // item.$.PresetAsBits
                break;
            }
            case 'PresetValue':
            {
                const presetValue = el = new PresetValue();
                if (item.Value) {
                    presetValue.value = item.Value[0];
                }
                break;
            }
            case 'Category':
                el = this.parseCategory(item);
                break;
            case 'Label':
                el = this.parseLabel(item);
                break;
            default:
            {
                return null;
            }
        }

        if (item.Item) {
            el.items = this.parseItems(item);
        }

        if (item.Label) {
            el.label = this.parseReference(item.Label[0], Label);
        }

        if (item.Identifier) {
            el.name = item.Identifier[0];
        }

        return el;
    }

    private parseItems(data: any) {
        const elItems: ElementReference<Element>[] = [];
        for (const itEntry of data.Item) {
            const cls = (ElementClasses as any)[itEntry.$.Type];
            if (!cls) continue;
            elItems.push(this.parseReference(itEntry, cls));
        }
        return elItems;
    }

    private parseTree(data: any, container: ElementContainer) {
        if (data.Root && data.Root[0].Item) {
            container.items = this.parseItems(data.Root[0]);
        }
        if (!data.Element) return;
        for (const item of data.Element) {
            const el = this.parseElement(item);
            if (el) {
                container.addElement(item.$.Id, el);
            }
        }
    }

    private parseLibrary(id: string, data: any): Library {
        const lib = new Library(id);
        this.parseTree(data, lib);
        return lib;
    }

    constructor(container: TriggerStore) {
        this.store = container;
    }

    protected loadXML(content: string) {
        return new Promise<any>((resolve, reject) => {
            xml.parseString(content, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        resolve(result.TriggerData);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            });
        });
    }

    public async loadLibrary(content: string): Promise<Library> {
        const data = await this.loadXML(content);
        const lib = this.parseLibrary(data.Standard[0].$.Id, data);
        this.store.addLibrary(lib);
        return lib;
    }

    public async load(content: string, onlyLibraries: boolean = false): Promise<TriggerStore> {
        const data = await this.loadXML(content);

        if (data.Library) {
            for (const item of data.Library) {
                const lib = this.parseLibrary(item.$.Id, item);
                this.store.addLibrary(lib);
            }
        }

        if (!onlyLibraries) {
            this.parseTree(data, this.store);
        }

        return this.store;
    }
}

// export function forEachElement(element: Element) {
//     function visitElement()
// }
