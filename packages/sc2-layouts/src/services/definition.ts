import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createDocumentFromVS } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, XMLElement, AttrValueKind } from '../types';
import { getAttrValueKind } from '../parser/parser';

export class DefinitionProvider extends AbstractProvider implements vs.DefinitionProvider {
    @svcRequest(false)
    async provideDefinition(document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken) {
        const sourceFile = await this.svcContext.syncVsDocument(document);
        const dlinks: vs.DefinitionLink[] = [];

        const offset = document.offsetAt(position);
        const node = <XMLElement>sourceFile.findNodeAt(offset);

        if (!node || !(node instanceof XMLElement) || !node.stype) return void 0;
        if (node.closed) {
            if (node.selfClosed && offset > node.end) return void 0;
            if (!node.selfClosed && offset > node.startTagEnd) return void 0;
        }

        const nattr = node.findAttributeAt(offset);
        if (!nattr || !nattr.startValue || nattr.startValue > offset) return void 0;

        switch (getAttrValueKind(nattr.value)) {
            case AttrValueKind.Constant:
            {
                const name = nattr.value.substr(nattr.value.charCodeAt(1) === CharacterCodes.hash ? 2 : 1);
                const citem = this.store.index.constants.get(name);
                if (citem) {
                    for (const decl of citem.declarations) {
                        const cdoc = decl.getDocument();
                        if (cdoc === sourceFile) {
                            dlinks.push({
                                targetUri: cdoc.uri,
                                targetRange: new vs.Range(
                                    document.positionAt(decl.start),
                                    document.positionAt(decl.end)
                                ),
                            });
                        }
                        else {
                            dlinks.push({
                                targetUri: cdoc.uri,
                                targetRange: new vs.Range(
                                    document.positionAt(0),
                                    document.positionAt(0)
                                ),
                            });
                        }
                    }
                }
                break;
            }
        }

        // let startOffset = node.start;
        // let scanner = createScanner(document.getText(), startOffset);
        // let token = scanner.scan();
        // let currentAttrName: string;
        // outer: while (token !== TokenType.EOS) {
        //     // console.log(scanner.getTokenOffset(), scanner.getTokenEnd(), TokenType[token], ScannerState[scanner.getScannerState()], scanner.getTokenText());
        //     if (token === TokenType.AttributeName) {
        //         currentAttrName = scanner.getTokenText();
        //     }
        //     if (scanner.getTokenEnd() > offset) break;
        //     // if (scanner.getTokenEnd() === offset) {
        //     //     switch (token) {
        //     //         case TokenType.StartTagOpen:
        //     //         case TokenType.StartTag:
        //     //         case TokenType.EndTag:
        //     //         case TokenType.Content:
        //     //         case TokenType.AttributeName:
        //     //         case TokenType.DelimiterAssign:
        //     //             break outer;
        //     //         default:
        //     //             break;
        //     //     }
        //     // }
        //     token = scanner.scan();
        // }
        // const tokenText = scanner.getTokenText();

        // switch (token) {
        //     case TokenType.AttributeValue:
        //     {
        //         break;
        //     }
        // }

        return dlinks.length ? dlinks : void 0;
    }
}