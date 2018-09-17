import * as gt from '../compiler/types';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import * as cat from '../sc2mod/datacatalog';
import { SC2Workspace } from '../sc2mod/archive';
export declare class S2WorkspaceMetadata {
    protected workspace: SC2Workspace;
    protected symbolMap: Map<string, trig.Element>;
    protected presetValueParentMap: Map<string, trig.Preset>;
    getElementSymbolName(el: trig.Element): string;
    private mapContainer(container);
    build(lang: string): Promise<void>;
    constructor(workspace: SC2Workspace);
    findElementByName(name: string): trig.Element;
    findPresetDef(presetValue: trig.PresetValue): trig.Preset;
    getConstantNamesOfPreset(preset: trig.Preset): string[];
    getElementDoc(el: trig.Element, extended: boolean): string;
    getSymbolDoc(symbolName: string, extended?: boolean): string;
    getFunctionArgumentsDoc(symbolName: string): string[];
    getElementTypeOfNode(node: gt.Node): trig.ParameterType;
    getLinksForGameType(gameType: string): ReadonlyMap<string, cat.CatalogEntry>;
    getGameLinkLocalizedName(gameType: string, gameLink: string, includePrefix?: boolean): string;
    getGameLinkKind(gameType: string, gameLink: string): string;
}
export declare function getDocumentationOfSymbol(store: Store, symbol: gt.Symbol, extended?: boolean): string;
