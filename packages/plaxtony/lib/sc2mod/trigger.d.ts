export declare const enum ElementFlag {
    Native = 2,
    FuncAction = 4,
    FuncCall = 8,
}
export declare class ElementReference<T extends Element> {
    private container;
    id: string;
    type: string;
    library: string;
    constructor(container: LibraryContainer);
    resolve(): T | undefined;
}
export declare class ParameterType {
    type: string;
    gameType?: string;
    typeElement?: ElementReference<Preset>;
}
export declare abstract class Element {
    static prefix?: string;
    libId: string;
    id: string;
    name?: string;
    flags: ElementFlag;
    toString(): string;
    textKey(kind: string): string;
}
export declare class ParamDef extends Element {
    type: ParameterType;
}
export declare class FunctionDef extends Element {
    static prefix: string;
    parameters: ElementReference<ParamDef>[];
    returnType?: string;
    getParameters(): ParamDef[];
}
export declare class Preset extends Element {
    baseType: string;
    values: ElementReference<PresetValue>[];
}
export declare class PresetValue extends Element {
    value?: string;
}
export declare class Library {
    private container;
    private id;
    private elements;
    private nameMap;
    private addElement(identifier, el);
    private parseReference<T>(data);
    private parseTree(data);
    constructor(container: LibraryContainer);
    fromFile(filename: string): Promise<boolean>;
    findElementByName(name: string): Element | undefined;
    findElementById<T extends Element>(id: string): T | undefined;
    getId(): string;
}
export declare class LibraryContainer extends Map<string, Library> {
    addFromFile(filename: string): Promise<Library | null>;
    findElementByName(name: string): Element | undefined;
    findElementById<T extends Element>(elementId: string, libraryId?: string): T | undefined;
}
