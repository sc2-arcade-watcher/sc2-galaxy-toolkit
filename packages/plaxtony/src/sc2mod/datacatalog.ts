import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { logger, logIt } from '../common';
import { SC2Archive, SC2Workspace } from './archive';
import * as dtypes from './dtypes';

export type CatalogEntryFamily = dtypes.S2DataCatalogDomain;
export type CatalogFileKind = string;
export type CatalogKeyName = string;

export interface CatalogEntity {
    family: dtypes.S2DataCatalogDomain;
    ctype: string;
    id: string;
}

export interface CatalogDeclaration extends CatalogEntity {
    uri: lsp.DocumentUri;
    position: lsp.Position;
}

export interface CatalogDocument {
    uri: lsp.DocumentUri;
    declarations: {[type: number]: Map<string, CatalogDeclaration>};
}

export class CatalogStore {
    protected documentMap = new Map<lsp.URI, CatalogDocument>();

    public remove(uri: lsp.URI) {
        const catDoc = this.documentMap.get(uri);
        if (!catDoc) return;
        this.documentMap.delete(uri);
    }

    @logIt()
    public update(doc: TextDocument, archive: SC2Archive) {
        this.remove(doc.uri);
        const catDoc: CatalogDocument = {
            uri: doc.uri,
            declarations: [],
        };
        parseCatalog(doc, (decl) => {
            let declarations = catDoc.declarations[decl.family];
            if (typeof declarations === 'undefined') {
                catDoc.declarations[decl.family] = declarations = new Map();
            }
            declarations.set(decl.id, decl);
        });
        this.documentMap.set(doc.uri, catDoc);
    }

    public *findEntry(family: CatalogEntryFamily) {
        for (const catDoc of this.documentMap.values()) {
            const declarations = catDoc.declarations[family];
            if (typeof declarations === 'undefined') continue;
            yield declarations.values();
        }
    }

    public *findEntryByName(family: CatalogEntryFamily, id: string) {
        for (const catDoc of this.documentMap.values()) {
            const declarations = catDoc.declarations[family];
            if (typeof declarations === 'undefined') continue;

            const decl = declarations.get(id);
            if (decl) {
                yield decl;
            }
        }
    }

    public get docCount(): number {
        return this.documentMap.size;
    }
}

const reDataElement = /\s*<C([A-Z][A-Za-z0-9]+)\s([^>]+)\/?>/;
const reAttrs = /([\w-]+)\s?=\s?"([^"]+)"/g;
const reSubwordSeparator = /(?=[A-Z])/;
type ParseCatalogOnDeclaration = (declaration: CatalogDeclaration) => void;

function parseCatalog(tdoc: TextDocument, onDeclaration: ParseCatalogOnDeclaration) {
    for (let i = 0; i < tdoc.lineCount; i++) {
        const content = tdoc.getText({ start: { line: i, character: 0 }, end: { line: i, character: 1024 } });
        const matchedElement = content.match(reDataElement);
        if (!matchedElement) continue;

        let family: dtypes.S2DataCatalogDomain | undefined;
        const kindList = matchedElement[1].split(reSubwordSeparator);
        while (1) {
            family = (dtypes as any).S2DataCatalogDomain[kindList.join('')];
            if (typeof family === 'number') break;
            if (kindList.length <= 1) break;
            kindList.pop();
        }

        if (!family) continue;

        const declaration: CatalogDeclaration = {
            family: family,
            id: '',
            ctype: matchedElement[1],
            uri: tdoc.uri,
            position: {
                line: i,
                character: matchedElement[0].length - matchedElement[1].length - matchedElement[2].length
            },
        };

        let matchedAttr: RegExpExecArray;
        while (matchedAttr = reAttrs.exec(matchedElement[2])) {
            switch (matchedAttr[1]) {
                case 'id':
                {
                    declaration.id = matchedAttr[2];
                    break;
                }

                case 'parent':
                case 'default':
                {
                    // (<any>entry)[matchedAttr[1]] = matchedAttr[2];
                    break;
                }
            }
        }
        reAttrs.lastIndex = 0;

        if (declaration.id.length <= 0) continue;

        onDeclaration(declaration);
    }
}
