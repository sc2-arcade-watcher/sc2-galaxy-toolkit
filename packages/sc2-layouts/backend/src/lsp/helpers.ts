import * as lsp from 'vscode-languageserver';
import { XMLElement, XMLDocument, XMLNode, XMLNodeKind } from '../types';
import { SimpleType } from '../schema/base';

export function rangeContainsPosition(range: lsp.Range, pos: lsp.Position) {
    if (range.start.line > pos.line) return false;
    if (range.end.line < pos.line) return false;
    if (range.start.line === pos.line && range.start.character > pos.character) return false;
    if (range.end.line === pos.line && range.end.character < pos.character) return false;
    return true;
}

export function vsRangeOrPositionOfXNode(xNode: XMLNode) {
    const xDoc = xNode.getDocument();
    let xEl: XMLElement;
    switch (xNode.kind) {
        case XMLNodeKind.Document:
        {
            const rootNode = (<XMLDocument>xNode).getRootNode();
            if (!rootNode) {
                const posSta = xDoc.tdoc.positionAt(xEl.start);
                return lsp.Range.create(
                    lsp.Position.create(posSta.line, posSta.character),
                    lsp.Position.create(posSta.line, posSta.character)
                );
            }
            else {
                xEl = rootNode;
            }
            break;
        }

        case XMLNodeKind.Element:
        {
            xEl = <XMLElement>xNode;
            break;
        }
    }

    const posSta = xDoc.tdoc.positionAt(xEl.start);
    const posEnd = xDoc.tdoc.positionAt(xEl.startTagEnd ? xEl.startTagEnd : xEl.end);
    return lsp.Range.create(
        lsp.Position.create(posSta.line, posSta.character),
        lsp.Position.create(posEnd.line, posEnd.character),
    );
}

export function vsLocationOfXEl(xEl: XMLNode) {
    return lsp.Location.create(xEl.getDocument().tdoc.uri, vsRangeOrPositionOfXNode(xEl));
}

export function getAttrInfoAtPosition(xDoc: XMLDocument, offset: number) {
    const xEl = <XMLElement>xDoc.findNodeAt(offset);
    if (!xEl || !(xEl instanceof XMLElement) || !xEl.stype) return;
    if (xEl.closed) {
        if (xEl.selfClosed && offset > xEl.end) return;
        if (!xEl.selfClosed && offset > xEl.startTagEnd) return;
    }

    const nattr = xEl.findAttributeAt(offset);
    if (
        (!nattr || !nattr.startValue) ||
        nattr.startValue >= offset ||
        nattr.startValue + 1 + nattr.value.length <= offset
    ) {
        return;
    }

    const xAttrNameLower = nattr.name.toLowerCase();
    const sAttrType = xEl.stype.attributes.get(xAttrNameLower);
    let sType: SimpleType;
    if (sAttrType) {
        sType = sAttrType.type;
    }

    return {
        xEl,
        xAttr: nattr,
        xAttrNameLower,
        sAttrType,
        sType: sType,
        offsetRelative: offset - (nattr.startValue + 1),
    };
}
