import * as lsp from 'vscode-languageserver';
import * as sch from '../../schema/base';
import { AbstractProvider, errGuard } from '../provider';
import { XMLElement } from '../../types';
import { DescNamespace, DescKind } from '../../index/desc';
import { fuzzysearch } from '../../common';
import { CharacterCodes } from '../../parser/scanner';
import { logIt } from '../../logger';

function symbolKindOfElement(xNode: XMLElement) {
    switch (xNode.sdef.nodeKind) {
        case sch.ElementDefKind.Constant:
            return lsp.SymbolKind.Constant;
        case sch.ElementDefKind.Frame:
            return lsp.SymbolKind.Struct;
        case sch.ElementDefKind.Animation:
            return lsp.SymbolKind.Event;
        case sch.ElementDefKind.StateGroup:
            return lsp.SymbolKind.Class;
        case sch.ElementDefKind.StateGroupState:
            return lsp.SymbolKind.Interface;
        default:
            return;
    }
}

function symbolKindOfDesc(descNode: DescNamespace) {
    switch (descNode.kind) {
        case DescKind.Frame:
            return lsp.SymbolKind.Struct;
        case DescKind.Animation:
            return lsp.SymbolKind.Event;
        case DescKind.StateGroup:
            return lsp.SymbolKind.Class;
        default:
            return;
    }
}

export class NavigationProvider extends AbstractProvider {
    public install() {
        this.slSrv.conn.onDocumentSymbol(this.provideDocumentSymbols.bind(this));
        this.slSrv.conn.onWorkspaceSymbol(this.provideWorkspaceSymbols.bind(this));
    }

    @errGuard()
    @logIt({ argsDump: (params: lsp.DocumentSymbolParams) => params.textDocument.uri })
    async provideDocumentSymbols(params: lsp.DocumentSymbolParams, token: lsp.CancellationToken): Promise<lsp.DocumentSymbol[]> {
        const xDoc = await this.slSrv.flushDocumentByUri(params.textDocument.uri);
        if (!xDoc) return;

        const document = xDoc.tdoc;

        function processNode(xNode: XMLElement) {
            if (!xNode.children) return;
            const symbolsContainer: lsp.DocumentSymbol[] = [];
            for (const child of xNode.children) {
                if (!child.sdef) continue;

                const sKind = symbolKindOfElement(child);
                if (!sKind) continue;

                const currSym = lsp.DocumentSymbol.create(
                    child.getAttributeValue('name'),
                    child.stype.name,
                    sKind,
                    lsp.Range.create(
                        document.positionAt(child.start),
                        document.positionAt(child.end)
                    ),
                    lsp.Range.create(
                        document.positionAt(child.start),
                        document.positionAt(child.startTagEnd !== void 0 ? child.startTagEnd : child.end)
                    )
                );
                symbolsContainer.push(currSym);

                switch (child.sdef.nodeKind) {
                    case sch.ElementDefKind.Frame:
                    case sch.ElementDefKind.StateGroup:
                    {
                        currSym.children = processNode(child);
                        break;
                    }
                }
            }

            return symbolsContainer;
        }

        return processNode(xDoc.getRootNode());
    }

    @errGuard()
    @logIt({
        argsDump: (params: lsp.WorkspaceSymbolParams) => params.query,
        resDump: (r: lsp.SymbolInformation[]) => r ? r.length : typeof r
    })
    async provideWorkspaceSymbols(params: lsp.WorkspaceSymbolParams, token: lsp.CancellationToken): Promise<lsp.SymbolInformation[]> {
        let query = params.query;
        const symbolsContainer: lsp.SymbolInformation[] = [];

        if (query.length && query.charCodeAt(0) === CharacterCodes.hash) {
            query = query.substr(1);
            for (const [constName, constCurr] of this.store.index.constants) {
                if (!fuzzysearch(query, constName)) continue;

                const xNode = Array.from(constCurr.declarations)[0];
                const xDoc = xNode.getDocument();
                const tmpPos = [
                    xDoc.tdoc.positionAt(xNode.start),
                    xNode.startTagEnd !== void 0 ? xDoc.tdoc.positionAt(xNode.startTagEnd) : xDoc.tdoc.positionAt(xNode.end)
                ];

                symbolsContainer.push({
                    name: `#${constName}`,
                    containerName: xNode.getAttributeValue('val'),
                    kind: lsp.SymbolKind.Constant,
                    location: lsp.Location.create(
                        xDoc.tdoc.uri,
                        lsp.Range.create(
                            lsp.Position.create(tmpPos[0].line, tmpPos[0].character),
                            lsp.Position.create(tmpPos[1].line, tmpPos[1].character)
                        )
                    )
                });
            }
        }
        else {
            const depth = query.split('/').length * 2 + 1;

            function processDesc(parentDesc: DescNamespace, dCurr: number) {
                for (const currDesc of parentDesc.children.values()) {
                    if (symbolsContainer.length >= 5000) return;
                    const sKind = symbolKindOfDesc(currDesc);
                    if (!sKind) continue;
                    if (!fuzzysearch(query, currDesc.name)) continue;

                    const xNode = <XMLElement>Array.from(currDesc.xDecls.values())[0];
                    const xDoc = xNode.getDocument();
                    const tmpPos = [
                        xDoc.tdoc.positionAt(xNode.start),
                        xNode.startTagEnd !== void 0 ? xDoc.tdoc.positionAt(xNode.startTagEnd) : xDoc.tdoc.positionAt(xNode.end)
                    ];

                    symbolsContainer.push({
                        name: currDesc.descRelativeName,
                        // containerName: fileDesc.name,
                        containerName: null,
                        kind: sKind,
                        location: lsp.Location.create(
                            xDoc.tdoc.uri,
                            lsp.Range.create(
                                lsp.Position.create(tmpPos[0].line, tmpPos[0].character),
                                lsp.Position.create(tmpPos[1].line, tmpPos[1].character)
                            )
                        )
                    });

                    if (dCurr > 0 && currDesc.children.size > 0) {
                        processDesc(currDesc, dCurr - 1);
                    }
                }
            }

            for (const fileDesc of this.store.index.rootNs.children.values()) {
                processDesc(fileDesc, depth);
            }
        }

        return symbolsContainer;
    }
}
