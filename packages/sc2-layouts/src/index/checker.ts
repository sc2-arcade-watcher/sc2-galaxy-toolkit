import * as sch from '../schema/base';
import { DiagnosticReport, XMLElement, AttrValueKind, DiagnosticCategory, XMLAttr } from '../types';
import { DescIndex, DescKind } from './desc';
import { LayoutDocument, Store } from './store';
import { SchemaValidator } from '../schema/validation';
import { CharacterCodes } from '../parser/scanner';
import { getAttrValueKind } from '../parser/utils';
import { ExpressionParser, NodeExpr } from '../parser/expressions';

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

    protected reportAtAttrName(nattr: XMLAttr, msg: string, category?: DiagnosticCategory) {
        this.reportAt(msg, { start: nattr.start, end: nattr.start + nattr.name.length, category: category });
    }

    protected reportAtAttrVal(nattr: XMLAttr, msg: string, category?: DiagnosticCategory) {
        this.reportAt(msg, { start: nattr.startValue || nattr.start, end: nattr.end, category: category });
    }

    protected forwardExpressionDiagnostics(nattr: XMLAttr, expr: NodeExpr) {
        this.diagnostics.push(...expr.diagnostics.map(item => {
            item.start += nattr.startValue + 1;
            item.end += nattr.startValue + 1;
            return item;
        }));
    }

    protected parseAndCheckPathSelector(nattr: XMLAttr) {
        const pathSel = this.exParser.parsePathSelector(nattr.value);
        if (pathSel.diagnostics.length) {
            this.forwardExpressionDiagnostics(nattr, pathSel);
        }
        return pathSel;
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

                if (cDesc.file !== null && !this.index.rootNs.get(cDesc.file)) {
                    this.reportAtAttrVal(el.attributes['file'], `Failed to locate specified Desc "${cDesc.file}"`);
                }

                if (cDesc.template !== null) {
                    const dItem = this.index.rootNs.getDeep(cDesc.template);
                    if (!dItem) {
                        this.reportAtAttrVal(el.attributes['template'], `Could not find template "${cDesc.template}"`);
                    }
                    else if (dItem.kind === DescKind.File) {
                        this.reportAtAttrVal(el.attributes['template'], `Cannot use FileDsc as template - "${cDesc.template}"`);
                    }
                }

                break;
            }
        }

        const indAtProcessed = new Set<string>();
        outer: for (const atName in el.attributes) {
            const nattr = el.attributes[atName];
            if (!nattr.startValue) continue;
            let asType: sch.SimpleType;

            const vstype = el.stype.attributes.get(atName);
            if (vstype) {
                asType = vstype.type;
            }

            if (!asType) {
                for (const [indKey, indItem] of el.stype.indeterminateAttributes) {
                    if (indAtProcessed.has(indKey)) continue;
                    asType = indItem.value;
                    indAtProcessed.add(indKey);
                }

                if (!asType) {
                    if (!(el.stype.flags & sch.ComplexTypeFlags.AllowExtraAttrs)) {
                        this.reportAtAttrName(nattr, `Unknown attribute "${nattr.name}"`, DiagnosticCategory.Message);
                    }
                    continue outer;
                }
            }

            switch (getAttrValueKind(nattr.value)) {
                case AttrValueKind.Constant:
                case AttrValueKind.ConstantRacial:
                {
                    const name = nattr.value.substr(nattr.value.charCodeAt(1) === CharacterCodes.hash ? 2 : 1);
                    const citem = this.index.constants.get(name);
                    if (!citem) {
                        this.reportAtAttrVal(nattr, `Undeclared constant "${nattr.value}"`);
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
                        this.reportAtAttrVal(nattr, `Invalid property name`, DiagnosticCategory.Warning);
                        continue outer;
                    }
                    break;
                }

                case AttrValueKind.Generic:
                {
                    const r = this.svalidator.validateAttrValue(nattr.value, asType);
                    if (r) {
                        this.reportAtAttrVal(nattr, r);
                        break;
                    }

                    switch (asType.builtinType) {
                        case sch.BuiltinTypeKind.DescTemplateName:
                        {
                            this.parseAndCheckPathSelector(nattr);
                            break;
                        }
                    }

                    break;
                }
            }
        }

        //
        if (el.stype.indeterminateAttributes.size) {
            for (const indAttr of el.stype.indeterminateAttributes.values()) {
                if (indAtProcessed.has(indAttr.key.name)) continue;
                this.reportAtNode(el, `Missing special attribute [${indAttr.key.name}]`);
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
