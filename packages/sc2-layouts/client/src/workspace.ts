import * as vs from 'vscode';
import * as lspc from 'vscode-languageclient';

interface S2WorkspaceStatusParams {
    s2ArchiveWsCount: number;
}

export class WorkspaceSetupChecker implements lspc.Disposable {
    protected subscriptions: { dispose(): any }[] = [];
    protected workspaceMonitorSB: vs.StatusBarItem;
    protected recentStatus: S2WorkspaceStatusParams;

    constructor(protected readonly langClient: lspc.LanguageClient) {
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

        // ===

        this.langClient.onNotification('sc2layout/workspaceStatus', (params: S2WorkspaceStatusParams) => {
            this.recentStatus = params;
            this.checkActiveTextEditor();
        });

        return this;
    }

    checkTextEditor(textEditor: vs.TextEditor | undefined) {
        this.workspaceMonitorSB.hide();

        if (!textEditor || textEditor.document.languageId !== 'sc2layout') return;

        if (!this.recentStatus) return;
        if (this.recentStatus.s2ArchiveWsCount > 0) return;

        this.workspaceMonitorSB.show();
    }

    checkActiveTextEditor() {
        this.checkTextEditor(vs.window.activeTextEditor);
    }

    dispose() {
        this.subscriptions.forEach(d => d.dispose());
        this.subscriptions = [];

        this.workspaceMonitorSB = void 0;
        this.recentStatus = void 0;
    }
}
