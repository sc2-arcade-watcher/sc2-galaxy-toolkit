import * as gt from '../compiler/types';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import { SC2Workspace } from '../sc2mod/archive';
export declare class S2WorkspaceMetadata {
    protected workspace: SC2Workspace;
    protected symbolMap: Map<string, trig.Element>;
    protected presetValueParentMap: Map<string, trig.Preset>;
    private getElementSymbolName(el);
    private mapContainer(container);
    build(): Promise<void>;
    constructor(workspace: SC2Workspace);
    findElementByName(name: string): trig.Element;
    findPresetDef(presetValue: trig.PresetValue): trig.Preset;
    getElementDoc(el: trig.Element): string;
    getSymbolDoc(symbolName: string): string;
    getFunctionArgumentsDoc(symbolName: string): string[];
}
export declare function getDocumentationOfSymbol(store: Store, symbol: gt.Symbol): string;
