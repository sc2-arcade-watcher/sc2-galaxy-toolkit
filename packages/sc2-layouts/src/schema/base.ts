import { oentries } from '../util';

export enum BuiltinTypeKind {
    Unknown,
    //
    Uint8,
    Uint16,
    Uint32,
    Uint64,
    Int8,
    Int16,
    Int32,
    Int64,
    Real32,
    String,
    Boolean,
    //
    DescReference,
    FileDescName,
    FrameName,
    FrameDescName,
    FrameReference,
    //
    Color,
    Handle,
}

// const reBool = /^(true|false)$/i;
// const reUint = /^\+?[0-9]+$/;
// const reInt = /^(\+|\-)?[0-9]+$/;
// const reReal = /^(\+|\-)?[0-9]+(\.[0-9]+)?[0-9]*$/;
// const reFlag = /^([\w \|\!]+)$/i;
// const reColor = /^([a-f0-9]{6}|\s*[0-9]{3},\s*[0-9]{3},\s*[0-9]{3})$/i;

// function validateBuiltinType(typeKind: BuiltinTypeKind, value: string) {
//     switch (typeKind) {
//         case BuiltinTypeKind.Boolean:
//             return reBool.test(value);
//         case BuiltinTypeKind.Uint8:
//         case BuiltinTypeKind.Uint16:
//         case BuiltinTypeKind.Uint32:
//         case BuiltinTypeKind.Uint64:
//             return reUint.test(value);
//         case BuiltinTypeKind.Int8:
//         case BuiltinTypeKind.Int16:
//         case BuiltinTypeKind.Int32:
//         case BuiltinTypeKind.Int64:
//             return reInt.test(value);
//         case BuiltinTypeKind.Real32:
//             return reReal.test(value);
//         case BuiltinTypeKind.Color:
//             return reColor.test(value);
//         case BuiltinTypeKind.String:
//             return true;
//     }
// }

//

export enum SModelKind {
    SimpleType,
    ComplexType,
}

export interface SModel {
    name?: string;
    // smtype?: SModelKind;
}

// ===

export enum SimpleTypeData {
    String,
    Number,
    Bool,
}

export enum SimpleTypeKind {
    Default,
    Enumaration,
    Flags,
    Pattern,
    Union,
}

export enum SimpleTypeFlags {
    CanBeEmpty            = 1 << 0,
}

export interface SimpleType extends SModel {
    kind: SimpleTypeKind;
    builtinType: BuiltinTypeKind;
    data: SimpleTypeData;
    flags: SimpleTypeFlags;
    union?: SimpleType[];
    evalues?: string[];
    patterns?: RegExp[];
}

// ===

export interface Attribute {
    name: string;
    type: SimpleType;
    required: boolean;
    documentation?: string;
}

export const enum ComplexTypeFlags {
    IsStruct            = 1 << 0,
    ReadOnly            = 1 << 2,
    AllowExtraAttrs     = 1 << 3,
}

export interface ComplexType extends SModel {
    flags: ComplexTypeFlags;
    attributes: Map<string, Attribute>;
    struct: Map<string, ElementDef>;
}

export const enum ElementDefFlags {
    TypeAlternation  = 1 << 1,
}

export enum ElementDefKind {
    Unknown,
    // Desc,
    // RequiredDefines,
    DescFlags,
    Include,
    Constant,
    Frame,
    FrameProperty,
    Animation,
    // AnimationEvent,
    // AnimationController,
    // AnimationControllerKey,
    StateGroup,
    // StateGroupDefaultState,
    StateGroupState,
    StateGroupStateCondition,
    StateGroupStateAction,
}

export interface ElementDef {
    nodeKind: ElementDefKind;
    flags: ElementDefFlags;
    name: string;
    type: ComplexType;
    alternateTypes?: Map<string, ComplexType>;
    label?: string;
    documentation?: string;
}

// ===

export interface FrameProperty {
    name: string;
    etype: ElementDef;
    fclass: FrameClass;
    isReadonly: boolean;
    isConstant: boolean;
    isTable: boolean;
    tableKey: string;
}

export interface FrameClass {
    name: string;
    cparent?: FrameClass;
    properties: Map<string, FrameProperty>;
}

export interface FrameType {
    name: string;
    blizzOnly: boolean;
    fclasses: Map<string, FrameClass>;
    fprops: Map<string, FrameProperty>;
}

// ===

export interface SchemaRegistry {
    readonly stypes: ReadonlyMap<string, SModel>;
    readonly fileRootType: ComplexType;

    getFrameType(scComplexType: ComplexType): FrameType;
    getFrameProperty(scElementDef: ElementDef): FrameProperty;

    getPropertyByName(name: string): FrameProperty;
}

