export const enum BuiltinTypeKind {
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
    DescTemplateName,
    FrameReference,
    AnimationName,
    EventName,
    StateGroupName,
    StateGroupStateName,
    PropertyName,
    PropertyValue,
    //
    Image,
    Color,
    Text,
    Hotkey,
    Sound,
    Style,
    Handle,
}

export const enum MappedComplexKind {
    Unknown,

    // StateGroup
    CFrameStateConditionProperty,
    CFrameStateConditionAnimationState,
    CFrameStateConditionStateGroup,
    CFrameStateConditionOption,
    CFrameStateSetStateAction,
    CFrameStateSetPropertyAction,
    CFrameStateSetAnimationPropAction,
    CFrameStateSetAnchorAction,
    CFrameStateSendEventAction,
    CFrameStatePlaySoundAction,
    CFrameStateApplyTemplateAction,
}

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
    Nullable            = 1 << 0,
}

export interface SEnumInfo {
    name: string;
    label?: string;
}

export interface SimpleType extends SModel {
    kind: SimpleTypeKind;
    builtinType: BuiltinTypeKind;
    data: SimpleTypeData;
    flags: SimpleTypeFlags;
    union?: SimpleType[];
    /* @deprecated */ evalues?: string[];
    emap?: Map<string, SEnumInfo>;
    patterns?: RegExp[];
}

// ===

export interface Attribute {
    name: string;
    type: SimpleType;
    required: boolean;
    default?: string;
    documentation?: string;
}

export interface IndeterminateAttr {
    key: SimpleType;
    value: SimpleType;
}

export const enum ComplexTypeFlags {
    IsStruct            = 1 << 0,
    ReadOnly            = 1 << 2,
    AllowExtraAttrs     = 1 << 3,
}

export interface ComplexType extends SModel {
    mpKind: MappedComplexKind;
    flags: ComplexTypeFlags;
    attributes: Map<string, Attribute>;
    indeterminateAttributes: Map<string, IndeterminateAttr>;
    struct: Map<string, ElementDef>;
    label?: string;
}

export const enum ElementDefFlags {
    TypeAlternation  = 1 << 1,
}

export enum ElementDefKind {
    Unknown,
    Desc,
    RequiredDefines,
    DescFlags,
    Include,
    Constant,
    Frame,
    FrameProperty,
    Animation,
    AnimationEvent,
    AnimationController,
    AnimationControllerKey,
    StateGroup,
    StateGroupDefaultState,
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
    readonly frameClasses: ReadonlyMap<string, FrameClass>;
    readonly frameClassProps: ReadonlyMap<string, FrameProperty[]>;
    readonly frameTypes: ReadonlyMap<string, FrameType>;

    getFrameType(scComplexType: ComplexType): FrameType;
    getFrameProperty(scElementDef: ElementDef): FrameProperty;

    getPropertyByName(name: string): FrameProperty;

    isPropertyBindAllowed(scElementDef: ElementDef, scComplexType: ComplexType, attrName: string): boolean;
}

