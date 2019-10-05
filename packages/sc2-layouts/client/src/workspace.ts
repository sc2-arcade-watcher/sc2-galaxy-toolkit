import * as vs from 'vscode';

export class WorkspaceSetupChecker implements vs.Disposable {
    protected subscriptions: { dispose(): any }[] = [];
    protected workspaceMonitorSB: vs.StatusBarItem;

    constructor(protected readonly svCtx: ServiceContext) {
    }

    install(): vs.Disposable {
        this.workspaceMonitorSB = vs.window.createStatusBarItem(vs.StatusBarAlignment.Left);
        this.workspaceMonitorSB.hide();
        this.workspaceMonitorSB.text = '$(alert) SC2Layout: Workspace not configured!';
        this.workspaceMonitorSB.tooltip = `Couldn't locate origin of SC2Layout file. As a result Intellisense capabilities will be greatly limited. To resolve this problem make sure to include SC2Mod/SC2Map folder in your project workspace. Use "File: Open folder" and navigate to SC2Mod/SC2Map component folder, or a parent folder that groups them.`;
        this.workspaceMonitorSB.command = 'workbench.action.files.openFolder';
        this.workspaceMonitorSB.color = new vs.ThemeColor('errorForeground');
        this.subscriptions.push(this.workspaceMonitorSB);

        this.subscriptions.push(vs.window.onDidChangeActiveTextEditor(this.checkTextEditor.bind(this)));

        return this;
    }

    checkTextEditor(textEditor: vs.TextEditor | undefined) {
        this.workspaceMonitorSB.hide();

        if (!textEditor || textEditor.document.languageId !== 'sc2layout') return;
        if (!(this.svCtx.state & ServiceStateFlags.StepModsDiscoveryDone)) return;

        if (vs.workspace.workspaceFolders !== void 0 && vs.workspace.workspaceFolders.length) {
            const nonNativeS2Documents = Array.from(this.svCtx.store.s2ws.archives.values()).filter(i => !i.native);
            if (nonNativeS2Documents.length) return;
        }

        this.workspaceMonitorSB.show();
    }

    checkActiveTextEditor() {
        this.checkTextEditor(vs.window.activeTextEditor);
    }

    dispose() {
        this.subscriptions.forEach(d => d.dispose());
        this.subscriptions = [];

        this.workspaceMonitorSB = void 0;
    }
}
