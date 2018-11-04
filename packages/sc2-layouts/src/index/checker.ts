import * as sch from '../schema/base';
import { DiagnosticReport, XMLElement, AttrValueKind, DiagnosticCategory, XMLAttr } from '../types';
import { DescIndex } from './desc';
import { LayoutDocument, Store } from './store';
import { SchemaValidator } from '../schema/validation';
import { CharacterCodes } from '../parser/scanner';
import { getAttrValueKind } from '../parser/utils';
import { ExpressionParser } from '../parser/expressions';

export class LayoutChecker {
    protected exParser = new ExpressionParser();
    protected svalidator: SchemaValidator;
    protected diagnostics: DiagnosticReport[] = [];

    constructor(protected store: Store, protected index: DescIndex) {
        this.svalidator = new SchemaValidator(this.store.schema);
    }

    protected reportAt(msg: string, options: {start: number, end: number, category?: DiagnosticCategory}) {
        this.diagnostics.push({
            start: options.start,
            end: options.end,
            category: typeof options.category !== 'undefined' ? options.category : DiagnosticCategory.Error,
            message: msg,
        });
    }

    protected reportAtNode(el: XMLElement, msg: string, category?: DiagnosticCategory) {
        this.reportAt(msg, { start: el.start, end: (el.startTagEnd || el.end), category: category });
    }

    protected reportAtAttr(nattr: XMLAttr, msg: string, category?: DiagnosticCategory) {
        this.reportAt(msg, { start: nattr.start, end: nattr.end, category: category });
    }

    protected checkElement(el: XMLElement) {
        if (!el.stype) return;
        this.svalidator.checkRequiredAttr(el);

        switch (el.sdef.nodeKind) {
            case sch.ElementDefKind.Frame:
            case sch.ElementDefKind.StateGroup:
            case sch.ElementDefKind.Animation:
            {
                const cDesc = this.index.resolveElementDesc(el);

                if (cDesc.file && !this.index.rootNs.get(cDesc.file)) {
                    this.reportAtNode(el, `Failed to locate specified Desc "${cDesc.file}"`);
                }

                if (cDesc.template) {
                    if (!this.index.rootNs.getDeep(cDesc.template)) {
                        this.reportAtNode(el, `Could not find template "${cDesc.template}"`);
                    }
                }

                break;
            }
        }

        outer: for (const atName in el.attributes) {
            const nattr = el.attributes[atName];
            if (!nattr.startValue) continue;
            let vstype = el.stype.attributes.get(atName);

            if (!vstype) {
                switch (el.sdef.nodeKind) {
                    case sch.ElementDefKind.StateGroupStateCondition:
                    case sch.ElementDefKind.StateGroupStateAction:
                    {
                        switch (el.stype.name) {
                            case 'CFrameStateConditionProperty':
                            case 'CFrameStateSetPropertyAction':
                            {
                                const sprop = this.store.schema.getPropertyByName(nattr.name);
                                if (!sprop) {
                                    this.reportAtAttr(nattr, `Expected valid property name, found "${nattr.name}"`, DiagnosticCategory.Warning);
                                    continue outer;
                                }
                                vstype = sprop.etype.type.attributes.get('val');
                                if (!vstype) vstype = sprop.etype.type.attributes.values().next().value;
                                if (!vstype) {
                                    this.reportAtAttr(nattr, `Internal type unknown [${sprop.etype.name}]`, DiagnosticCategory.Warning);
                                    continue outer;
                                }
                                break;
                            }
                        }
                        break;
                    }

                    default:
                    {
                    }
                }

                if (!vstype) {
                    if (!(el.stype.flags & sch.ComplexTypeFlags.AllowExtraAttrs)) {
                        this.reportAtAttr(nattr, `Unknown attribute "${nattr.name}"`, DiagnosticCategory.Message);
                    }
                    continue outer;
                }
            }

            switch (getAttrValueKind(nattr.value)) {
                case AttrValueKind.Constant:
                {
                    const name = nattr.value.substr(nattr.value.charCodeAt(1) === CharacterCodes.hash ? 2 : 1);
                    const citem = this.index.constants.get(name);
                    if (!citem) {
                        this.reportAtAttr(nattr, `Undeclared constant "${nattr.value}"`)
                        continue outer;
                    }
                    break;
                }

                case AttrValueKind.PropertyBind:
                {
                    const propBind = this.exParser.parsePropertyBind(nattr.value);
                    if (propBind.diagnostics.length) {
                        this.diagnostics.push(...propBind.diagnostics.map(item => {
                            item.start += nattr.startValue + 1;
                            item.end += nattr.startValue + 1;
                            return item;
                        }));
                        continue outer;
                    }
                    const sprop = this.store.schema.getPropertyByName(propBind.property.name);
                    if (!sprop) {
                        this.reportAtAttr(nattr, `Invalid property name`, DiagnosticCategory.Warning);
                        continue outer;
                    }
                    break;
                }

                case AttrValueKind.Generic:
                {
                    const r = this.svalidator.validateAttrValue(nattr.value, vstype.type);
                    if (r) this.reportAtAttr(nattr, r);
                    break;
                }
            }
        }

        el.children.forEach(this.checkElement.bind(this));
    }

    public checkFile(file: LayoutDocument) {
        this.svalidator.diagnostics = [];
        this.diagnostics = [];
        if (!file.getDescNode()) return [];
        this.checkElement(file.getDescNode());
        // return this.diagnostics;
        return this.svalidator.diagnostics.concat(this.diagnostics);
    }
}
