import * as fs from 'fs';
import * as xml from 'xml2js';

export const enum ElementFlag {
    Native = 1 << 1,
    FuncAction = 1 << 2,
    FuncCall = 1 << 3,
    Event = 1 << 4,
}

export class ElementReference<T extends Element> {
    private container: LibraryContainer;
    id: string;
    type: string;
    library: string;

    public constructor(container: LibraryContainer) {
        this.container = container;
    }

    public resolve(): T | undefined {
        return this.container.findElementById(this.type + '/' + this.id, this.library) as T;
    }
}

export class ParameterType {
    type: string;
    gameType?: string; // when type == gamelink; e.g. Model
    typeElement?: ElementReference<Preset>; // when type == preset;
}

export abstract class Element {
    static prefix?: string;
    libId: string;
    id: string;
    name?: string;
    flags: ElementFlag;

    public toString() {
        if (this.flags & ElementFlag.Native) {
            return this.name ? this.name : this.id;
        }
        else {
            const parts: string[] = [];
            parts.push('lib' + this.libId);
            const prefix = (<any>this.constructor).prefix;
            if (prefix) {
                parts.push(prefix);
            }
            parts.push(this.name ? this.name : this.id);
            return parts.join('_');
        }
    }

    public textKey(kind: string) {
        const parts: string[] = [];
        parts.push(this.constructor.name);
        parts.push(kind);
        parts.push(['lib', this.libId, this.id].join('_'));
        return parts.join('/');
    }
}

export class ParamDef extends Element {
    type: ParameterType;
}

export class FunctionDef extends Element {
    static prefix = 'gf';
    parameters: ElementReference<ParamDef>[] = [];
    returnType?: string;

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

const prefixRE = /^lib([^_]+)_([^_]+)_(.+)$/;

export class Library {
    private container: LibraryContainer;
    private id: string;
    private elements: Map<string, Element> = new Map();
    private nameMap: Map<string, Element> = new Map();

    private addElement(identifier: string, el: Element) {
        el.libId = this.id;
        el.id = identifier;
        this.elements.set(el.constructor.name + '/' + identifier, el);
        if (el.name) {
            this.nameMap.set(el.name, el);
        }
    }

    private parseReference<T extends Element>(data: any): ElementReference<T> {
        const ref = new ElementReference<T>(this.container);
        ref.id = data.$.Id;
        ref.library = data.$.Library;
        ref.type = data.$.Type;
        return ref;
    }

    private parseTree(data: any) {
        this.id = data.Standard[0].$.Id;
        for (const item of data.Element) {
            let el: Element;

            switch (item.$.Type) {
                case 'FunctionDef':
                {
                    const func = el = new FunctionDef();

                    func.flags |= item.FlagNative ? ElementFlag.Native : 0;
                    func.flags |= item.FlagAction ? ElementFlag.FuncAction : 0;
                    func.flags |= item.FlagCall ? ElementFlag.FuncCall : 0;
                    func.flags |= item.FlagEvent ? ElementFlag.Event : 0;

                    if (item.Parameter) {
                        for (const param of item.Parameter) {
                            func.parameters.push(this.parseReference(param));
                        }
                    }

                    if (item.ReturnType) {
                        func.returnType = item.ReturnType[0].Type[0].$.Value;
                    }
                    break;
                }
                case 'ParamDef':
                {
                    const param = el = new ParamDef();
                    param.type = new ParameterType();
                    param.type.type = item.ParameterType[0].Type[0].$.Value;
                    if (param.type.type === 'gamelink') {
                        param.type.gameType = item.ParameterType[0].GameType[0].$.Value;
                    }
                    if (param.type.type === 'preset') {
                        param.type.typeElement = this.parseReference(item.ParameterType[0].TypeElement[0]);
                    }
                    break;
                }
                case 'Preset':
                {
                    const preset = el = new Preset();
                    preset.baseType = item.BaseType[0].$.Value;
                    if (item.Item) {
                        for (const val of item.Item) {
                            preset.values.push(this.parseReference(val));
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
                default:
                {
                    continue;
                }
            }

            if (item.Identifier) {
                el.name = item.Identifier[0];
            }

            this.addElement(item.$.Id, el);
        }
    }

    constructor(container: LibraryContainer) {
        this.container = container;
    }

    public fromFile(filename: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            xml.parseString(fs.readFileSync(filename, 'utf8'), (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.parseTree(result.TriggerData);
                        resolve(true);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            });
        });
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

    public findElementById<T extends Element>(id: string): T | undefined {
        return this.elements.get(id) as T;
    }

    public getId() {
        return this.id;
    }
}

export class LibraryContainer extends Map<string, Library> {
    public async addFromFile(filename: string): Promise<Library|null> {
        const lib = new Library(this);
        if (await lib.fromFile(filename)) {
            this.set(lib.getId(), lib);
            return lib;
        }
        return null;
    }

    public findElementByName(name: string): Element | undefined {
        const prefix = prefixRE.exec(name);
        if (prefix) {
            return this.get(prefix[1]).findElementByName(prefix[3]);
        }

        for (const lib of this.values()) {
            const el = lib.findElementByName(name);
            if (el) {
                return el;
            }
        }

        return undefined;
    }

    public findElementById<T extends Element>(elementId: string, libraryId?: string): T | undefined {
        if (libraryId) {
            if (this.has(libraryId)) {
                return this.get(libraryId).findElementById(elementId) as T;
            }
        }
        for (const lib of this.values()) {
            const el = lib.findElementById(elementId) as T;
            if (el) {
                return el;
            }
        }
        return undefined;
    }

    public findPresetValueByStr(value: string, libraryId?: string): PresetValue | undefined {
        if (libraryId) {
            if (this.has(libraryId)) {
                return this.get(libraryId).findPresetValueByStr(value);
            }
        }
        for (const lib of this.values()) {
            const el = lib.findPresetValueByStr(value);
            if (el) {
                return el;
            }
        }
        return undefined;
    }

    public findPresetByValue(value: PresetValue, libraryId?: string): Preset | undefined {
        if (libraryId) {
            if (this.has(libraryId)) {
                return this.get(libraryId).findPresetByValue(value);
            }
        }
        for (const lib of this.values()) {
            const el = lib.findPresetByValue(value);
            if (el) {
                return el;
            }
        }
        return undefined;
    }
}
