import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { XMLElement } from '../types';
import { DescNamespace, DescKind } from '../index/desc';
import { fuzzysearch } from '../common';
import { CharacterCodes } from '../parser/scanner';

function symbolKindOfElement(xNode: XMLElement) {
    switch (xNode.sdef.nodeKind) {
        case sch.ElementDefKind.Constant:
            return vs.SymbolKind.Constant;
        case sch.ElementDefKind.Frame:
            return vs.SymbolKind.Struct;
        case sch.ElementDefKind.Animation:
            return vs.SymbolKind.Event;
        case sch.ElementDefKind.StateGroup:
            return vs.SymbolKind.Class;
        case sch.ElementDefKind.StateGroupState:
            return vs.SymbolKind.Interface;
        default:
            return;
    }
}

function symbolKindOfDesc(descNode: DescNamespace) {
    switch (descNode.kind) {
        case DescKind.Frame:
            return vs.SymbolKind.Struct;
        case DescKind.Animation:
            return vs.SymbolKind.Event;
        case DescKind.StateGroup:
            return vs.SymbolKind.Class;
        default:
            return;
    }
}

export class NavigationProvider extends AbstractProvider implements vs.DocumentSymbolProvider, vs.WorkspaceSymbolProvider {
    @svcRequest(false, (doc: vs.TextDocument) => doc.uri.fsPath)
    async provideDocumentSymbols(document: vs.TextDocument, token: vs.CancellationToken): Promise<vs.DocumentSymbol[]> {
        const xDoc = await this.svcContext.syncVsDocument(document);

        function processNode(xNode: XMLElement) {
            if (!xNode.children) return;
            const symbolsContainer: vs.DocumentSymbol[] = [];
            for (const child of xNode.children) {
                if (!child.sdef) continue;

                const sKind = symbolKindOfElement(child);
                if (!sKind) continue;

                const currSym = new vs.DocumentSymbol(
                    child.getAttributeValue('name'),
                    child.stype.name,
                    sKind,
                    new vs.Range(
                        document.positionAt(child.start),
                        document.positionAt(child.end)
                    ),
                    new vs.Range(
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

        return processNode(xDoc.getDescNode());
    }

    @svcRequest(false, void 0, (r: vs.SymbolInformation[] | undefined) => r ? r.length : typeof r)
    async provideWorkspaceSymbols(query: string, token: vs.CancellationToken): Promise<vs.SymbolInformation[]> {
        const symbolsContainer: vs.SymbolInformation[] = [];

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
                    kind: vs.SymbolKind.Constant,
                    location: new vs.Location(
                        vs.Uri.parse(xDoc.tdoc.uri),
                        new vs.Range(
                            new vs.Position(tmpPos[0].line, tmpPos[0].character),
                            new vs.Position(tmpPos[1].line, tmpPos[1].character)
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
                        location: new vs.Location(
                            vs.Uri.parse(xDoc.tdoc.uri),
                            new vs.Range(
                                new vs.Position(tmpPos[0].line, tmpPos[0].character),
                                new vs.Position(tmpPos[1].line, tmpPos[1].character)
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
