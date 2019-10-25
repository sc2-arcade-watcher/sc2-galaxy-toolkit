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
    FileDescName,
    DescName,
    DescTemplateName,
    FrameReference,
    AnimationName,
    EventName,
    StateGroupName,
    StateGroupStateName,
    PropertyName,
    PropertyValue,
    Mixed,
    //
    Image,
    Color,
    Text,
    Hotkey,
    Sound,
    Style,
    Handle,
    //
    ConstantName,
    DescInternal,
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
    CFrameStateCreateFromTemplateAction,
}

export enum ModelKind {
    SimpleType = 'simpleType',
    ComplexType = 'complexType',
    Element = 'element',
    FrameClass = 'frameClass',
    FrameType = 'frameType',
}

export type ModelKindT = 'simpleType' | 'complexType' | 'element' | 'frameClass' | 'frameType';

export interface AbstractModel {
    smKind: ModelKind;
    name: string;
    // flags?: CommonTypeFlags | any;
}

export enum CommonTypeFlags {
    Virtual            = 1 << 0,
}

// ===

export enum SimpleTypeData {
    String,
    Number,
    Bool,
    Internal,
}

export enum SimpleTypeKind {
    Default,
    Enumaration,
    Flags,
    Pattern,
    Union,
}

export enum SimpleTypeFlags {
    Nullable            = 1 << 10,
    EnumMask            = 1 << 11,
}

export interface SEnumInfo {
    name: string;
    label?: string;
}

export interface SimpleType extends AbstractModel {
    kind: SimpleTypeKind;
    builtinType: BuiltinTypeKind;
    data: SimpleTypeData;
    flags: CommonTypeFlags | SimpleTypeFlags;
    internalType?: string;
    union?: SimpleType[];
    emap?: Map<string, SEnumInfo>;
    patterns?: RegExp[];
    label?: string;
    documentation?: string;
}

// ===

export interface Attribute {
    name: string;
    type: SimpleType;
    required: boolean;
    default?: string;
    label?: string;
    documentation?: string;
}

export interface IndeterminateAttr {
    key: SimpleType;
    value: SimpleType;
}

export const enum ComplexTypeFlags {
    IsStruct            = 1 << 10,
    ReadOnly            = 1 << 12,
    AllowExtraAttrs     = 1 << 13,
}

interface ComplexTypeInheritance {
    from: Map<string, ComplexType>;
    attrs: Map<Attribute, ComplexType>;
    elements: Map<ElementDef, ComplexType>;
}

interface ComplexTypeOrigin {
    attrs: Set<Attribute>;
    elements: Set<ElementDef>;
}

export interface ComplexType extends AbstractModel {
    mpKind: MappedComplexKind;
    flags: CommonTypeFlags | ComplexTypeFlags;
    attributes: Map<string, Attribute>;
    indeterminateAttributes: Map<string, IndeterminateAttr>;
    struct: Map<string, ElementDef>;
    label?: string;
    documentation?: string;
    inheritance: ComplexTypeInheritance;
    origin: ComplexTypeOrigin;
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

export const enum AlternativeMatchKind {
    AttrValue,
    Expression,
}

export interface AlternationDesc {
    matchKind: AlternativeMatchKind;
    attributeName: string;
    icase: boolean;
    statements: Map<string, AlternationStatementDesc>;
}

export interface AlternationStatementDesc {
    type: ComplexType;
    altType?: AlternationDesc;
}

export interface ElementDef extends AbstractModel {
    nodeKind: ElementDefKind;
    flags: ElementDefFlags;
    name: string;
    type: ComplexType;
    altType?: AlternationDesc;
    label?: string;
    documentation?: string;
}

// ===

export interface FrameProperty {
    name: string;
    etype: ElementDef;
    fclass: FrameClass;
    isReadonly: boolean;
    isTable: boolean;
    tableKey: string;
}

export interface FrameClass extends AbstractModel {
    name: string;
    cparent?: FrameClass;
    properties: Map<string, FrameProperty>;
}

export interface FrameHookup {
    path: string;
    fClass: FrameClass;
    required: boolean;
}

export interface FrameType extends AbstractModel {
    name: string;
    blizzOnly: boolean;
    customDesc?: ComplexType;
    fclasses: Map<string, FrameClass>;
    fprops: Map<string, FrameProperty>;
    complexType: ComplexType;
    hookups: Map<string, FrameHookup>;
}

// ===

export interface FlattenedEnumItem {
    originType: SimpleType;
    value: string;
    label: string;
}

export interface SchemaRegistry {
    readonly fileRootType: ComplexType;
    readonly frameClassProps: Map<string, FrameProperty[]>;
    readonly frameTypes: Map<string, FrameType>;

    getFrameType(scComplexType: ComplexType): FrameType;
    getFrameProperty(scElementDef: ElementDef): FrameProperty;
    getFrameDescs(sFrameType: FrameType): ComplexType[];

    getPropertyByName(name: string): FrameProperty;

    isPropertyBindAllowed(scElementDef: ElementDef, scComplexType: ComplexType, attrName: string): boolean;

    flattenSTypeEnumeration(smType: SimpleType): Map<string, FlattenedEnumItem>;
}

export interface SchemaFileProvider {
    readFile(filename: string): Promise<string>;
    listDir(pattern: string): Promise<string[]>;
}
