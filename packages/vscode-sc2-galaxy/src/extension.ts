'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import Uri from 'vscode-uri';
import ChildProcess = cp.ChildProcess;

import * as rpc from './rpc';


const DELIMITERS = '~`!@#$%^&*()-+={}[]|\\\'";:/?<>,. \t\n';
const reFuncCallSymbolName = /([a-zA-Z0-9_]+)\s*$/;
const reFuncCallName = /([a-zA-Z0-9_]+)\s*\([^\()]*$/;

function isDelimiter(c: string) {
    return DELIMITERS.indexOf(c) !== -1;
}

function findPreviousDelimiter(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    let line = position.line;
    let char = position.character;
    const s = document.getText(new vscode.Range(line, 0, line, char));
    while (char > 0 && !isDelimiter(s[char - 1])) char--;
    return new vscode.Position(line, char);
}

class GalaxyClient implements vscode.DocumentSymbolProvider, vscode.CompletionItemProvider, vscode.SignatureHelpProvider, vscode.DefinitionProvider {
    private static commandId = 'galaxy.runCodeAction';
    private diagnosticCollection: vscode.DiagnosticCollection;
    private rpcClient: rpc.JsonRpcClient;
    private outputChannel: vscode.OutputChannel;

    public async activate(subscriptions: vscode.Disposable[]) {
        this.outputChannel = vscode.window.createOutputChannel('sc2-galaxy');
        this.outputChannel.appendLine('activated');

        this.rpcClient = new rpc.JsonRpcClient({
            endpoint: 'http://localhost:3689/',
        });
        await this.rpcCall('init', {workspace: vscode.workspace.rootPath});

        subscriptions.push(vscode.languages.registerDocumentSymbolProvider('galaxy', this));
        subscriptions.push(vscode.languages.registerCompletionItemProvider('galaxy', this, '.'));
        subscriptions.push(vscode.languages.registerSignatureHelpProvider('galaxy', this, '(', ','));
        subscriptions.push(vscode.languages.registerDefinitionProvider('galaxy', this));

        this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

        vscode.workspace.onDidOpenTextDocument(this.doLint, this, subscriptions);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);

        // vscode.workspace.onDidChangeTextDocument();

        vscode.workspace.onDidSaveTextDocument(this.doLint, this);

        // vscode.workspace.textDocuments.forEach(this.doLint, this);
    }

    public async rpcCall(method: string, params?: object): Promise<any> {
        this.outputChannel.appendLine('rpc call: ' + method);
        try {
            return await this.rpcClient.request(method, params);
        }
        catch (err) {
            this.outputChannel.appendLine('rpc err: ' + err);
        }
    }

    private async doLint(textDocument: vscode.TextDocument) {
        if (textDocument.languageId !== 'galaxy') {
            return;
        }

        let diagnostics: vscode.Diagnostic[] = [];
        let result = await this.rpcCall('lint', {'filename': textDocument.fileName});
        for (let item of result.reports) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(item.line - 1, item.pos - 1, item.line - 1, item.pos - 1),
                item.message,
                vscode.DiagnosticSeverity.Error
            ));
        }
        this.diagnosticCollection.set(textDocument.uri, diagnostics);
    }

    public async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken):
    Promise<vscode.SymbolInformation[]> {
        let symbols: vscode.SymbolInformation[] = [];
        let result = await this.rpcCall('provideDocumentSymbols', {'filename': document.fileName});
        let symKindMap = {
            'FunctionDefinition': vscode.SymbolKind.Function,
            'Struct': vscode.SymbolKind.Struct,
            'VariableDeclaration': vscode.SymbolKind.Variable,
            'ArgumentDefinition': vscode.SymbolKind.Variable,
            'Constant': vscode.SymbolKind.Constant,
            'Typedef': vscode.SymbolKind.Field,
        };
        for (let item of result.symbols) {
            try {
                let kind: vscode.SymbolKind = symKindMap[item.kind];
                symbols.push(new vscode.SymbolInformation(
                    item.name,
                    kind,
                    item.container,
                    new vscode.Location(document.uri, new vscode.Position(item.location.line - 1, item.location.pos - 1))
                ));
            }
            catch (err) {
                this.outputChannel.appendLine('sym kind err: ' + err);
            }
        }
        return symbols;
    }

    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    Promise<vscode.CompletionItem[]> {
        let delimPosition = findPreviousDelimiter(document, position);
        let expr = document.getText(new vscode.Range(delimPosition, position));

        // document.getWordRangeAtPosition()

        let result = await this.rpcCall('provideCompletionItems', {
            'filename': document.fileName,
            'position': {
                'line': position.line + 1, 'pos': position.character + 1
            },
            'expr': expr
        });

        let symKindMap = {
            'FunctionDefinition': vscode.CompletionItemKind.Function,
            'Struct': vscode.CompletionItemKind.Struct,
            'VariableDeclaration': vscode.CompletionItemKind.Variable,
            'ArgumentDefinition': vscode.CompletionItemKind.Variable,
        };

        let compl: vscode.CompletionItem[] = [];
        for (let item of result.completions) {
            try {
                let kind: vscode.CompletionItemKind = symKindMap[item.kind];
                let compItem: vscode.CompletionItem = new vscode.CompletionItem(
                    item.name,
                    kind,
                );
                compItem.detail = item.detail;
                compl.push(compItem);
            }
            catch (err) {
                this.outputChannel.appendLine('comp kind err: ' + err);
            }
        }

        return compl;
    }

    public async provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    Promise<vscode.SignatureHelp> {
        const fullCode = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let inString = false;
        let bracketCounter = 0;
        let commaCounter = 0;
        let symbolName = null;
        for (let i = fullCode.length - 1; i > 0; i--) {
            let char = fullCode.charAt(i);

            if (bracketCounter < 0) {
                if (char === '"' && (
                    (inString && fullCode.charAt(i - 1) !== '\\') ||
                    !inString
                )) {
                    inString = !inString;
                    continue;
                }

                if (inString) {
                    continue;
                }
            }

            if (char === ';') {
                return null;
            }
            else if (char === '(') {
                --bracketCounter;
            }
            else if (char === ')') {
                ++bracketCounter;
            }
            else if (char === ',' && bracketCounter === 0) {
                ++commaCounter;
            }

            if (bracketCounter < 0) {
                symbolName = reFuncCallSymbolName.exec(fullCode.substr(0, i));
                if (symbolName) {
                    symbolName = symbolName[1];
                }
                break;
            }
        }
        if (symbolName) {
            const signature = new vscode.SignatureHelp();

            let result = await this.rpcCall('provideSignatureHelp', {
                'filename': document.fileName,
                'position': {
                    'line': position.line + 1, 'pos': position.character + 1
                },
                'symbolName': symbolName
            });

            for (let sigInfo of result.signatures) {
                const sigHelp = new vscode.SignatureInformation(sigInfo.label, sigInfo.docs);
                for (let sigParam of sigInfo.parameters) {
                    sigHelp.parameters.push(new vscode.ParameterInformation(sigParam.label, sigParam.docs));
                }
                signature.signatures.push(sigHelp);
            }

            signature.activeParameter = commaCounter;
            signature.activeSignature = 0;

            return signature;
        }

        return null;
    }

    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition> {
        const symbolName = document.getText(document.getWordRangeAtPosition(position));
        let result = await this.rpcCall('provideDefinition', {
            'filename': document.fileName,
            'position': {
                'line': position.line + 1, 'pos': position.character + 1
            },
            'symbolName': symbolName
        });
        if (result) {
            return new vscode.Location(
                Uri.file(result.file),
                new vscode.Position(result.location.line - 1, result.location.pos - 1)
            );
        }
        return null;
    }
}

export function activate(context: vscode.ExtensionContext) {
    let gc = new GalaxyClient();

    let disposable = vscode.commands.registerCommand('sc2galaxy.nectan.activate', () => {
        vscode.window.showInformationMessage('nectan activated');
        gc.activate(context.subscriptions);
    });

}

export function deactivate() {
}