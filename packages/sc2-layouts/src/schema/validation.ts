import * as sch from './base';
import { DiagnosticReport, XMLElement, XMLAttr, DiagnosticCategory } from '../types';

const reBool = /^(true|false)$/i;
const reUint = /^\s*\+?[0-9]+\s*$/;
const reInt = /^\s*(\+|\-)?[0-9]+\s*$/;
const reReal = /^\s*(\+|\-)?(([0-9]+\.[0-9]*)|([0-9]*\.?[0-9]+))\s*$/;
// const reFlag = /^([\w \|\!]+)$/i;
export const reValueColor = /^([a-f0-9]{6,8}|\s*[0-9]{1,3},\s*[0-9]{1,3},\s*[0-9]{1,3}(,\s*[0-9]{1,3})?)$/i;

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

    protected validateBuiltinType(value: string, stype: sch.SimpleType): undefined | string {
        switch (stype.builtinType) {
            case sch.BuiltinTypeKind.Boolean:
                if (reBool.test(value)) break;
                return `Expected "true" or "false" [${stype.name}]`;
                break;

            case sch.BuiltinTypeKind.Uint8:
            case sch.BuiltinTypeKind.Uint16:
            case sch.BuiltinTypeKind.Uint32:
            case sch.BuiltinTypeKind.Uint64:
                if (reUint.test(value)) break;
                return `Expected numeric value [${stype.name}]`;

            case sch.BuiltinTypeKind.Int8:
            case sch.BuiltinTypeKind.Int16:
            case sch.BuiltinTypeKind.Int32:
            case sch.BuiltinTypeKind.Int64:
                if (reInt.test(value)) break;
                return `Expected numeric value [${stype.name}]`;

            case sch.BuiltinTypeKind.Real32:
                if (reReal.test(value)) break;
                return `Expected fixed numeric value [${stype.name}]`;

            case sch.BuiltinTypeKind.Color:
                if (reValueColor.test(value)) break;
                return `Expected RGB or ARGB color value in hex format (i.e. "FF00FF") or decimal (i.e. "127,255,0,255") [${stype.name}]`;
        }
        return void 0;
    }

    public validateAttrValue(atValue: string, stype: sch.SimpleType): undefined | string {
        if (!atValue.length) {
            if (stype.flags & sch.SimpleTypeFlags.Nullable) return void 0;
            if (stype.kind === sch.SimpleTypeKind.Flags) return void 0;
        }

        switch (stype.kind) {
            case sch.SimpleTypeKind.Default:
            {
                return this.validateBuiltinType(atValue, stype);
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
            case sch.SimpleTypeKind.Union:
            {
                if (stype.patterns) {
                    if (!stype.patterns[0].test(atValue)) {
                        return `Incorrect value; expected pattern ${stype.patterns[0]}`;
                    }
                }

                if (stype.union) {
                    for (const subType of stype.union) {
                        const rv = this.validateAttrValue(atValue, subType);
                        if (!rv) return void 0;
                    }
                    return `Attribute value couldn't be validated by any of the union types: ${stype.union.map(item => `"${item.name}"`).join(', ')}`;
                }
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
        for (const [sname, sattr] of node.stype.attributes) {
            if (!sattr.required) continue;
            if (node.attributes[sname]) continue;
            this.appendDiagnostics(node, `Required attribute "${sattr.name}" not specified`, {category: DiagnosticCategory.Error});
        }
    }
}
