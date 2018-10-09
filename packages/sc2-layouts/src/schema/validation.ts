import * as sch from './base';
import { DiagnosticReport, XMLElement, XMLAttr, DiagnosticCategory } from '../types';

export class SchemaValidator {
    diagnostics: DiagnosticReport[] = [];

    constructor(protected sreg: sch.SchemaRegistry) {
    }

    protected appendDiagnostics(node: XMLElement, msg: string, options: {start?: number, end?: number, category?: DiagnosticCategory} = {}) {
        this.diagnostics.push({
            start: typeof options.start !== 'undefined' ? options.start : node.start,
            end: typeof options.end !== 'undefined' ? options.end : (node.startTagEnd || node.end),
            category: typeof options.category !== 'undefined' ? options.category : DiagnosticCategory.Error,
            message: msg,
        });
    }

    public validateSimpleType(value: string, stype: sch.SimpleType): undefined | string {
        switch (stype.builtinType) {
            case sch.BuiltinTypeKind.Unknown:
                return this.validateAttrValue(value, stype);
                break;
        }
        return void 0;
    }

    public validateAttrValue(atValue: string, stype: sch.SimpleType): undefined | string {
        if (!atValue.length && stype.flags & sch.SimpleTypeFlags.CanBeEmpty) return void 0;
        switch (stype.kind) {
            case sch.SimpleTypeKind.Default:
            {
                break;
            }
            case sch.SimpleTypeKind.Enumaration:
            {
                if (stype.evalues.indexOf(atValue) === -1 && stype.evalues.findIndex(item => item.length === atValue.length && item.toLowerCase() === atValue.toLowerCase()) === -1) {
                    return `"${atValue}" doesn't match enumeration ${stype.name}`;
                }
                break;
            }
            case sch.SimpleTypeKind.Flags:
            {
                const vl = atValue.split('|');
                for (let currValue of vl) {
                    currValue = currValue.trim();
                    if (stype.evalues.indexOf(currValue) === -1 && stype.evalues.findIndex(item => item.length === currValue.length && item.toLowerCase() === currValue.toLowerCase()) === -1) {
                        return `"${currValue}" doesn't match enumeration ${stype.name}`;
                    }
                }
                break;
            }
            case sch.SimpleTypeKind.Pattern:
            {
                if (!stype.patterns[0].test(atValue)) {
                    return `Incorrect value; expected pattern ${stype.patterns[0]}`;
                }
                break;
            }
            case sch.SimpleTypeKind.Union:
            {
                for (const subType of stype.union) {
                    const rv = this.validateAttrValue(atValue, subType);
                    if (!rv) return void 0;
                }
                return `Attribute value couldn't be validated by any of the union types: ${stype.union.map(item => `"${item.name}"`).join(', ')}`;
                break;
            }
            default:
            {
                return `Unknown stype ${stype.name}`;
                break;
            }
        }

        return void 0;
    }

    public checkRequiredAttr(node: XMLElement) {
        for (const sattr of node.stype.attributes.values()) {
            if (!sattr.required) continue;
            if (node.attributes[sattr.name]) continue;
            this.appendDiagnostics(node, `Required attribute "${sattr.name}" not specified`, {category: DiagnosticCategory.Message});
        }
    }
}