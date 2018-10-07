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
            this.appendDiagnostics(node, `Required attribute "${sattr.name}" not specified`);
        }
    }

    public validateNode(node: XMLElement) {
        if (!node.stype) return false;

        const sdlen = this.diagnostics.length;

        this.checkRequiredAttr(node);

        outer: for (const attrKey in node.attributes) {
            const nodeAttr = node.attributes[attrKey];

            if (!node.stype.attributes.has(attrKey)) {
                if (node.stype.flags & sch.ComplexTypeFlags.AllowExtraAttrs) continue;
                this.appendDiagnostics(node, `Unexpected attribute "${attrKey}"`, {
                    start: nodeAttr.start,
                    end: nodeAttr.end,
                    category: DiagnosticCategory.Warning,
                });
                continue;
            }

            if (typeof nodeAttr.value === 'undefined') continue;

            switch (nodeAttr.value.charCodeAt(0)) {
                case 0x23: // constant
                case 0x7B: // prop bind
                    continue outer;
            }

            const vr = this.validateAttrValue(nodeAttr.value, node.stype.attributes.get(attrKey).type);
            if (typeof vr === 'string') {
                this.appendDiagnostics(node, vr, {
                    start: nodeAttr.start,
                    end: nodeAttr.end,
                });
            }
        }

        return sdlen === this.diagnostics.length;
    }
}