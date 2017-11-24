"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const xml = require("xml2js");
var ElementFlag;
(function (ElementFlag) {
    ElementFlag[ElementFlag["Native"] = 2] = "Native";
    ElementFlag[ElementFlag["FuncAction"] = 4] = "FuncAction";
    ElementFlag[ElementFlag["FuncCall"] = 8] = "FuncCall";
    ElementFlag[ElementFlag["Event"] = 16] = "Event";
    ElementFlag[ElementFlag["Template"] = 32] = "Template";
    ElementFlag[ElementFlag["PresetGenConstVar"] = 64] = "PresetGenConstVar";
    ElementFlag[ElementFlag["PresetCustom"] = 128] = "PresetCustom";
})(ElementFlag = exports.ElementFlag || (exports.ElementFlag = {}));
class ElementReference {
    constructor(container, type) {
        // this.type = type;
        this.store = container;
    }
    link() {
        return this.type.name + '/' + this.id;
    }
    globalLink() {
        let link = this.link();
        if (this.library) {
            link = this.library + '/' + link;
        }
        return link;
    }
    resolve() {
        if (this.library) {
            const lib = this.store.getLibraries().get(this.library);
            return lib.findElementById(this.link(), null);
        }
        return this.store.findElementById(this.link(), null);
        // return this.container.findElementById(this.id, this.type) as T;
    }
}
exports.ElementReference = ElementReference;
class ParameterType {
}
exports.ParameterType = ParameterType;
class Element {
    link() {
        return (this.libId ? this.libId + '/' : '') + (this.constructor.name + '/') + this.id;
    }
    toString() {
        if (this.flags & 2 /* Native */) {
            return this.name ? this.name : this.id;
        }
        else {
            const parts = [];
            if (this.libId) {
                parts.push('lib' + this.libId);
            }
            const prefix = this.constructor.prefix;
            if (prefix) {
                parts.push(prefix);
            }
            parts.push(this.name ? this.name : this.id);
            return parts.join('_');
        }
    }
    textKey(kind) {
        const parts = [];
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
exports.Element = Element;
class ParamDef extends Element {
}
exports.ParamDef = ParamDef;
class FunctionDef extends Element {
    constructor() {
        super(...arguments);
        this.parameters = [];
    }
    getParameters() {
        return this.parameters.map((paramRef) => {
            return paramRef.resolve();
        });
    }
}
FunctionDef.prefix = 'gf';
exports.FunctionDef = FunctionDef;
class Preset extends Element {
    constructor() {
        super(...arguments);
        this.values = [];
    }
}
exports.Preset = Preset;
class PresetValue extends Element {
}
exports.PresetValue = PresetValue;
class Param extends Element {
}
exports.Param = Param;
const ElementClasses = {
    ParamDef,
    FunctionDef,
    Preset,
    PresetValue,
    Param,
};
// export class TriggerExplorer {
//     protected containers: ElementContainer;
// }
class ElementContainer {
    constructor() {
        this.elements = new Map();
        this.nameMap = new Map();
    }
    addElement(identifier, el) {
        el.id = identifier;
        if (el instanceof FunctionDef) {
            this.nameMap.set(el.name, el);
        }
        this.elements.set(el.constructor.name + '/' + el.id, el);
    }
    findElementByName(name) {
        return this.nameMap.get(name);
    }
    findPresetValueByStr(value) {
        for (const el of this.elements.values()) {
            if (!(el instanceof PresetValue))
                continue;
            if (el.value && el.value == value) {
                return el;
            }
        }
        return null;
    }
    findPresetByValue(value) {
        for (const el of this.elements.values()) {
            if (!(el instanceof Preset))
                continue;
            const belongsTo = el.values.find((localVal) => {
                return value.id === localVal.id;
            });
            if (belongsTo) {
                return el;
            }
        }
        return null;
    }
    findElementById(id, type) {
        if (type && type.name !== 'Element') {
            id = type.name + '/' + id;
        }
        return this.elements.get(id);
    }
    getElements() {
        return this.elements;
    }
}
exports.ElementContainer = ElementContainer;
class Library extends ElementContainer {
    constructor(id) {
        super();
        this.id = id;
    }
    addElement(identifier, el) {
        el.libId = this.id;
        super.addElement(identifier, el);
    }
    getId() {
        return this.id;
    }
}
exports.Library = Library;
class TriggerStore extends ElementContainer {
    constructor() {
        super(...arguments);
        this.libraries = new Map();
        this.unresolvedReferences = new Map();
    }
    addElementReference(ref) {
        const link = ref.globalLink();
        if (this.unresolvedReferences.has(link)) {
            const refList = this.unresolvedReferences.get(link);
            refList.push(ref);
        }
        else {
            this.unresolvedReferences.set(link, [ref]);
        }
    }
    addLibrary(library) {
        this.libraries.set(library.getId(), library);
    }
    // public findElementById<T extends Element>(elementId: string, libraryId?: string): T | undefined {
    //     if (libraryId) {
    //         return this.libraries.get(libraryId).findElementById(elementId) as T;
    //     }
    //     return super.findElementById(elementId) as T;
    // }
    getLibraries() {
        return this.libraries;
    }
}
exports.TriggerStore = TriggerStore;
class XMLReader {
    parseReference(data, type) {
        const ref = new ElementReference(this.store, type);
        ref.id = data.$.Id;
        if (data.$.Library) {
            ref.library = data.$.Library;
        }
        ref.type = ElementClasses[type.name];
        this.store.addElementReference(ref);
        return ref;
    }
    parseElement(item) {
        let el;
        switch (item.$.Type) {
            case 'FunctionDef':
                {
                    const func = el = new FunctionDef();
                    func.flags |= item.FlagNative ? 2 /* Native */ : 0;
                    func.flags |= item.FlagAction ? 4 /* FuncAction */ : 0;
                    func.flags |= item.FlagCall ? 8 /* FuncCall */ : 0;
                    func.flags |= item.FlagEvent ? 16 /* Event */ : 0;
                    func.flags |= item.Template ? 32 /* Template */ : 0;
                    if (item.Parameter) {
                        for (const param of item.Parameter) {
                            func.parameters.push(this.parseReference(param, ParamDef));
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
                        param.type.typeElement = this.parseReference(item.ParameterType[0].TypeElement[0], Preset);
                    }
                    break;
                }
            case 'Preset':
                {
                    const preset = el = new Preset();
                    preset.flags |= item.PresetGenConstVar ? 64 /* PresetGenConstVar */ : 0;
                    preset.flags |= item.PresetCustom ? 128 /* PresetCustom */ : 0;
                    preset.baseType = item.BaseType[0].$.Value;
                    if (item.Item) {
                        for (const val of item.Item) {
                            if (val.$.Type !== 'PresetValue')
                                continue;
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
            default:
                {
                    return null;
                }
        }
        if (item.Identifier) {
            el.name = item.Identifier[0];
        }
        return el;
    }
    parseTree(data, container) {
        if (!data.Element)
            return;
        for (const item of data.Element) {
            const el = this.parseElement(item);
            if (el) {
                container.addElement(item.$.Id, el);
            }
        }
    }
    parseLibrary(id, data) {
        const lib = new Library(id);
        this.parseTree(data, lib);
        return lib;
    }
    constructor(container) {
        this.store = container;
    }
    loadXML(content) {
        return new Promise((resolve, reject) => {
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
    loadLibrary(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadXML(content);
            const lib = this.parseLibrary(data.Standard[0].$.Id, data);
            this.store.addLibrary(lib);
            return lib;
        });
    }
    load(content, onlyLibraries = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadXML(content);
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
        });
    }
}
exports.XMLReader = XMLReader;
//# sourceMappingURL=trigger.js.map