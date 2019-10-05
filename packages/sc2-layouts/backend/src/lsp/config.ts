export enum ExtCfgSchemaUpdateMode {
    Auto = 'auto',
    Manual = 'manual',
}

export type SectionTrace = {
    server: 'off' | 'messages' | 'verbose';
    service: 'error' | 'warn' | 'info' | 'verbose' | 'debug';
};

export type SectionSchema = {
    updateMode: keyof typeof ExtCfgSchemaUpdateMode;
    localPath: string;
};

export type tBuiltinMods = {[name: string]: boolean};

export enum ExtConfigCompletionTabStopKind {
    EOL = 'EOL',
    Attr = 'Attr',
}

export type SectionCompletion = {
    tabStop: keyof typeof ExtConfigCompletionTabStopKind;
    stategroupDefaultState: boolean | string;
};

export type SectionTreeView = {
    visible: boolean;
};

export type S2LConfig = {
    schema: SectionSchema;
    dataPath: string;
    builtinMods: tBuiltinMods;
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number | false;
    completion: SectionCompletion;
    treeview: SectionTreeView;
};

export type ExtCfgKey = keyof S2LConfig;
