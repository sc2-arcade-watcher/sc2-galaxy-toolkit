import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { XMLElement } from '../types';
import { ServiceStateFlags } from '../service';
import { isConstantValue } from '../parser/utils';
import { reValueColor } from '../schema/validation';

interface ColorLiteral {
    vColor: vs.Color;
    ntDecimal: boolean;
    inclAlpha: boolean;
}

function parseColorLiteral(val: string): ColorLiteral {
    if (val.indexOf(',') !== -1) {
        const colComponents = val.split(',');
        if (colComponents.length === 4) {
            return {
                vColor: new vs.Color(
                    Number(colComponents[1].trim()) / 255.0,
                    Number(colComponents[2].trim()) / 255.0,
                    Number(colComponents[3].trim()) / 255.0,
                    Number(colComponents[0].trim()) / 255.0
                ),
                inclAlpha: true,
                ntDecimal: true,
            };
        }
        else {
            return {
                vColor: new vs.Color(
                    Number(colComponents[0].trim()) / 255.0,
                    Number(colComponents[1].trim()) / 255.0,
                    Number(colComponents[2].trim()) / 255.0,
                    1
                ),
                inclAlpha: false,
                ntDecimal: true,
            };
        }
    }
    else if (val.length === 6) {
        return {
            vColor: new vs.Color(
                parseInt(val.substr(0, 2), 16) / 255.0,
                parseInt(val.substr(2, 2), 16) / 255.0,
                parseInt(val.substr(4, 2), 16) / 255.0,
                1
            ),
            inclAlpha: false,
            ntDecimal: false,
        };
    }
    else if (val.length === 8) {
        return {
            vColor: new vs.Color(
                parseInt(val.substr(2, 2), 16) / 255.0,
                parseInt(val.substr(4, 2), 16) / 255.0,
                parseInt(val.substr(6, 2), 16) / 255.0,
                parseInt(val.substr(0, 2), 16) / 255.0
            ),
            inclAlpha: true,
            ntDecimal: false,
        };
    }
}

export class DocumentColorProvider extends AbstractProvider implements vs.DocumentColorProvider {
    @svcRequest()
    async provideDocumentColors(document: vs.TextDocument, token: vs.CancellationToken): Promise<vs.ColorInformation[]> {
        if (!(this.svcContext.state & ServiceStateFlags.StepFilesDone)) return;

        const xDoc = await this.svcContext.syncVsDocument(document);
        const xRoot = xDoc.getDescNode();
        if (!xRoot) return;
        const xray = this.xray;

        const colInfo: vs.ColorInformation[] = [];

        function processXElement(xEl: XMLElement) {
            if (!xEl.stype) return;

            outer: for (const attrName in xEl.attributes) {
                const schAt = xEl.stype.attributes.get(attrName);
                let sType: sch.SimpleType;
                if (!schAt) {
                    const indAt = xray.matchIndeterminateAttr(xEl, xEl.attributes[attrName].name);
                    if (indAt) {
                        sType = indAt.value;
                    }
                    else {
                        continue;
                    }
                }
                else {
                    sType = schAt.type;
                }

                switch (sType.builtinType) {
                    case sch.BuiltinTypeKind.Color:
                    case sch.BuiltinTypeKind.Mixed:
                    case sch.BuiltinTypeKind.PropertyValue:
                    {
                        break;
                    }

                    default:
                    {
                        continue outer;
                    }
                }

                const xAt = xEl.attributes[attrName];
                if (!xAt.startValue) continue;
                if (!xAt.value.length) continue;
                if (isConstantValue(xAt.value)) continue;
                if (!reValueColor.test(xAt.value)) continue;

                const iCol = parseColorLiteral(xAt.value.trim());
                if (!iCol) continue;

                const staOffset = xDoc.tdoc.positionAt(xAt.startValue + 1);
                const endOffset = xDoc.tdoc.positionAt(xAt.startValue + 1 + xAt.value.length);
                colInfo.push(new vs.ColorInformation(
                    new vs.Range(
                        new vs.Position(staOffset.line, staOffset.character),
                        new vs.Position(endOffset.line, endOffset.character),
                    ),
                    iCol.vColor
                ));
            }

            for (const xChild of xEl.children) {
                processXElement(xChild);
            }
        }

        processXElement(xRoot);

        return colInfo;
    }

    @svcRequest()
    async provideColorPresentations(color: vs.Color, context: { document: vs.TextDocument; range: vs.Range; }, token: vs.CancellationToken): Promise<vs.ColorPresentation[]> {
        const iCol = parseColorLiteral(context.document.getText(context.range).trim());
        if (!iCol) return;

        const decCP: vs.ColorPresentation = {
            label: (
                ((iCol.inclAlpha || color.alpha !== 1.0) ? (Math.round((color.alpha * 255.0)).toString(10) + ',') : '') +
                Math.round((color.red * 255.0)).toString(10) + ',' +
                Math.round((color.green * 255.0)).toString(10) + ',' +
                Math.round((color.blue * 255.0)).toString(10)
            )
        };

        const hexCP: vs.ColorPresentation = {
            label: (
                ((iCol.inclAlpha || color.alpha !== 1.0) ? (Math.round((color.alpha * 255.0)).toString(16).padStart(2, '0')) : '') +
                Math.round((color.red * 255.0)).toString(16).padStart(2, '0') +
                Math.round((color.green * 255.0)).toString(16).padStart(2, '0') +
                Math.round((color.blue * 255.0)).toString(16).padStart(2, '0')
            )
        };

        return [decCP, hexCP];
    }
}
