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
const fs = require("fs");
const xml = require("xml2js");
var ElementFlag;
(function (ElementFlag) {
    ElementFlag[ElementFlag["Native"] = 2] = "Native";
    ElementFlag[ElementFlag["FuncAction"] = 4] = "FuncAction";
    ElementFlag[ElementFlag["FuncCall"] = 8] = "FuncCall";
})(ElementFlag = exports.ElementFlag || (exports.ElementFlag = {}));
class ElementReference {
    constructor(container) {
        this.container = container;
    }
    resolve() {
        return this.container.findElementById(this.type + '/' + this.id, this.library);
    }
}
exports.ElementReference = ElementReference;
class ParameterType {
}
exports.ParameterType = ParameterType;
class Element {
    toString() {
        if (this.flags & 2) {
            return this.name ? this.name : this.id;
        }
        else {
            const parts = [];
            parts.push('lib' + this.libId);
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
        parts.push(['lib', this.libId, this.id].join('_'));
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
const prefixRE = /^lib([^_]+)_([^_]+)_(.+)$/;
class Library {
    constructor(container) {
        this.elements = new Map();
        this.nameMap = new Map();
        this.container = container;
    }
    addElement(identifier, el) {
        el.libId = this.id;
        el.id = identifier;
        this.elements.set(el.constructor.name + '/' + identifier, el);
        if (el.name) {
            this.nameMap.set(el.name, el);
        }
    }
    parseReference(data) {
        const ref = new ElementReference(this.container);
        ref.id = data.$.Id;
        ref.library = data.$.Library;
        ref.type = data.$.Type;
        return ref;
    }
    parseTree(data) {
        this.id = data.Standard[0].$.Id;
        for (const item of data.Element) {
            let el;
            switch (item.$.Type) {
                case 'FunctionDef':
                    {
                        const func = el = new FunctionDef();
                        func.flags |= item.FlagNative ? 2 : 0;
                        func.flags |= item.FlagAction ? 4 : 0;
                        func.flags |= item.FlagCall ? 8 : 0;
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
    fromFile(filename) {
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
    findElementByName(name) {
        return this.nameMap.get(name);
    }
    findElementById(id) {
        return this.elements.get(id);
    }
    getId() {
        return this.id;
    }
}
exports.Library = Library;
class LibraryContainer extends Map {
    addFromFile(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const lib = new Library(this);
            if (yield lib.fromFile(filename)) {
                this.set(lib.getId(), lib);
                return lib;
            }
            return null;
        });
    }
    findElementByName(name) {
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
    findElementById(elementId, libraryId) {
        if (libraryId) {
            if (this.has(libraryId)) {
                return this.get(libraryId).findElementById(elementId);
            }
        }
        for (const lib of this.values()) {
            const el = lib.findElementById(elementId);
            if (el) {
                return el;
            }
        }
        return undefined;
    }
}
exports.LibraryContainer = LibraryContainer;
//# sourceMappingURL=trigger.js.map