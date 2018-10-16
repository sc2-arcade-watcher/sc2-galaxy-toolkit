import * as sch from '../schema/base';
import { DiagnosticReport, XMLElement, AttrValueKind, DiagnosticCategory, XMLAttr } from '../types';
import { DescIndex, FileDesc, DescItemContainer, FrameDesc } from './desc';
import { LayoutDocument, Store } from './store';
import { SchemaValidator } from '../schema/validation';
import { CharacterCodes } from '../parser/scanner';
import { parseFramePropBinding, getAttrValueKind } from '../parser/selector';

export class LayoutProcessor {
    protected svalidator: SchemaValidator;

    constructor(protected store: Store, protected index: DescIndex) {
        this.svalidator = new SchemaValidator(this.store.schema);
    }

    determineFrameDescContext(el: XMLElement, fileDesc: FileDesc) {
        let dcontext: DescItemContainer;
        try {
            switch (el.sdef.nodeKind) {
                case sch.ElementDefKind.StateGroupStateCondition:
                case sch.ElementDefKind.StateGroupStateAction:
                {
                    dcontext = fileDesc.mappedNodes.get(<XMLElement>el.parent.parent.parent);
                    break;
                }

                case sch.ElementDefKind.AnimationController:
                case sch.ElementDefKind.AnimationEvent:
                {
                    dcontext = fileDesc.mappedNodes.get(<XMLElement>el.parent.parent);
                    break;
                }

                case sch.ElementDefKind.FrameProperty:
                {
                    dcontext = fileDesc.mappedNodes.get(<XMLElement>el.parent);
                    break;
                }

                case sch.ElementDefKind.Frame:
                {
                    dcontext = fileDesc.mappedNodes.get(<XMLElement>el);
                    break;
                }
            }
            return <FrameDesc>dcontext;
        }
        catch (e) {
            return void 0;
        }
    }

    getFClassPropertyType(el: XMLElement, attrName: string) {
        switch (el.sdef.nodeKind) {
            case sch.ElementDefKind.FrameProperty:
            {
                if (attrName !== 'val') break;
                const tmpa = el.stype.attributes.get(attrName);
                if (!tmpa) break;
                return tmpa.type;
            }

            case sch.ElementDefKind.StateGroupStateCondition:
            case sch.ElementDefKind.StateGroupStateAction:
            {
                switch (el.stype.name) {
                    case 'CFrameStateConditionProperty':
                    case 'CFrameStateSetPropertyAction':
                    {
                        const cprop = this.store.schema.getPropertyByName(attrName);
                        if (!cprop) break;
                        try {
                            return cprop.etype.type.attributes.get('val').type;
                        }
                        catch (e) {
                            break;
                        }
                    }
                }

                break;
            }
        }

        return void 0;
    }
}

export class LayoutChecker extends LayoutProcessor {
    protected diagnostics: DiagnosticReport[] = [];

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
                    const pbind = parseFramePropBinding(nattr.value);
                    if (pbind.errors) {
                        pbind.errors.forEach(msg => { this.reportAtAttr(nattr, msg) });
                        continue outer;
                    }
                    const sprop = this.store.schema.getPropertyByName(pbind.propertyName);
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
        this.checkElement(file.getDescNode());
        // return this.diagnostics;
        return this.svalidator.diagnostics.concat(this.diagnostics);
    }
}