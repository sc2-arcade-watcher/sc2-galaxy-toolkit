import * as sch from '../schema/base';
import { DiagnosticReport, XMLElement, AttrValueKind, DiagnosticCategory, XMLAttr } from '../types';
import { DescIndex, DescKind, DescNamespace, DescStrCaseMissmatchInfo } from './desc';
import { LayoutDocument, Store } from './store';
import { SchemaValidator } from '../schema/validation';
import { CharacterCodes } from '../parser/scanner';
import { getAttrValueKind } from '../parser/utils';
import { ExpressionParser, NodeExpr, SelHandleKind, SelectorFragment, PathSelector } from '../parser/expressions';
import { UINavigator, UIBuilder, UINode, FrameNode } from './hierarchy';

export class DescResolvedSelection {
    public readonly items: DescNamespace[][] = [];

    constructor(protected pathFrags: SelectorFragment[]) {
    }

    get isValid() {
        return this.items.length === this.pathFrags.length && this.pathFrags.length !== 0;
    }

    get target() {
        if (!this.isValid) return;
        return this.items[this.items.length - 1];
    }

    get firstTarget() {
        return this.target[0];
    }
}

export class LayoutChecker {
    protected exParser = new ExpressionParser();
    protected svalidator: SchemaValidator;
    protected diagnostics: DiagnosticReport[] = [];
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;

    constructor(protected store: Store, protected index: DescIndex) {
        this.svalidator = new SchemaValidator(this.store.schema);
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
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

    protected parseAndCheckDescPath(nattr: XMLAttr) {
        const pathSel = this.parseAndCheckPathSelector(nattr);
        if (pathSel.diagnostics.length > 0) return;

        if (pathSel.path.length === 0) {
            this.reportAtAttrVal(nattr, `Path not specified`);
            return;
        }

        return pathSel;
    }

    public resolveDescPath(contextDesc: DescNamespace, pathSel: PathSelector) {
        let resolvedDesc = new DescResolvedSelection(pathSel.path);
        let relativeDesc: DescNamespace = void 0;
        let uNode: UINode;

        for (let i = 0; i < pathSel.path.length; i++) {
            // resolve top frame node of a layout if $root is used
            if (pathSel.path[0].selKind === SelHandleKind.Root && i < 3) {
                if (i === 0) {
                    relativeDesc = this.store.index.rootNs;
                }
                else {
                    relativeDesc = relativeDesc.get(pathSel.path[i].name.name);
                }

                if (!relativeDesc) break;
                resolvedDesc.items.push([relativeDesc]);
            }
            else {
                if (i === 0) {
                    relativeDesc = contextDesc;
                }
                if (!uNode) {
                    uNode = this.uBuilder.buildNodeFromDesc(relativeDesc);
                    if (!uNode) break;
                }
                uNode = this.uNavigator.resolveSelectorFragment(uNode, pathSel.path[i]);

                if (!uNode) break;
                resolvedDesc.items.push(Array.from(uNode.descs));
            }
        }

        return resolvedDesc;
    }

    protected checkGenericAttribute(cDesc: DescNamespace, nattr: XMLAttr, sType: sch.SimpleType) {
        const validationResult = this.svalidator.validateAttrValue(nattr.value, sType);
        if (validationResult) {
            this.reportAtAttrVal(nattr, validationResult);
            return;
        }

        switch (sType.builtinType) {
            case sch.BuiltinTypeKind.DescTemplateName:
            {
                const pathSel = this.parseAndCheckDescPath(nattr);
                if (!pathSel) break;
                const pathValues = Array.from(pathSel.path).map(selFrag => nattr.value.substring(selFrag.pos, selFrag.end));

                const dResult = this.index.rootNs.getStrictCase(...pathValues);
                let dItem: DescNamespace;
                if (!dResult) {
                    this.reportAtAttrVal(nattr, `Could not find template "${nattr.value}"`);
                }
                else {
                    if (typeof (<DescStrCaseMissmatchInfo<DescNamespace>>dResult)._icaseMissmatch !== 'undefined') {
                        const tmp = <DescStrCaseMissmatchInfo<DescNamespace>>dResult;
                        dItem = tmp.r;
                        this.reportAtAttrVal(
                            nattr,
                            `Case sensitivity of the given path doesn't match with the definition. Fix "${tmp._icaseMissmatch}".`,
                            DiagnosticCategory.Warning
                        );
                    }
                    else {
                        dItem = dResult as DescNamespace;
                    }

                    if (dItem.kind === DescKind.File) {
                        this.reportAtAttrVal(nattr, `Cannot use FileDesc as template`);
                    }
                }
                break;
            }

            case sch.BuiltinTypeKind.DescInternal:
            {
                const pathSel = this.parseAndCheckDescPath(nattr);
                if (!pathSel) break;

                const resolvedSel = this.resolveDescPath(cDesc, pathSel);
                if (!resolvedSel.isValid) {
                    const selFrag = pathSel.path[resolvedSel.items.length];
                    this.reportAt(`Couldn't find matching desc for "${nattr.value}"`, {
                        start: nattr.startValue + selFrag.pos + 1,
                        end: nattr.startValue + selFrag.end + 1,
                    });
                    break;
                }

                const frameType = this.store.schema.getFrameType(resolvedSel.firstTarget.stype);
                if (!frameType || !frameType.fclasses.has(sType.internalType)) {
                    this.reportAtAttrVal(
                        nattr,
                        `Specified desc of type "${frameType ? frameType.name : resolvedSel.firstTarget.stype.name}" is not a descendant of "${sType.internalType}"`
                    );
                }
            }
        }
    }

    protected checkFrameHookups(el: XMLElement, ufNode: FrameNode) {
        const sFrameType = this.store.schema.getFrameType(el.stype);
        const propHookupAlias = ufNode.propHookupAlias;
        for (const sHookup of sFrameType.hookups.values()) {
            let desiredPath: string;
            const pHookAlias = propHookupAlias.get(sHookup.path);
            if (pHookAlias && pHookAlias.alias) {
                desiredPath = pHookAlias.alias;
            }
            else {
                desiredPath = sHookup.path;
            }
            const uChild = this.uNavigator.resolveChild(ufNode, desiredPath.split('/'));

            if (!uChild) {
                if (!sHookup.required) continue;
                this.reportAtNode(
                    el,
                    `Frame[${sFrameType.name}] is missing hookup definition of "${sHookup.fClass.name}" at path "${sHookup.path}".`,
                    DiagnosticCategory.Message
                );
                continue;
            }

            const sChildFType = this.store.schema.getFrameType(uChild.mainDesc.stype);
            if (!sChildFType) continue;
            if (sChildFType.fclasses.has(sHookup.fClass.name)) continue;

            const inheritanceChain: string[] = [sHookup.fClass.name];
            let cp = sHookup.fClass;
            while (cp = cp.cparent) {
                inheritanceChain.push(cp.name);
            }
            const isAncestor = Array.from(sChildFType.fclasses.keys()).every(cName => inheritanceChain.includes(cName));
            if (isAncestor) continue;

            this.reportAtNode(
                el,
                `Frame[${sFrameType.name}] incorrect hookup type at path "${sHookup.path}": found class "${Array.from(sChildFType.fclasses.values()).pop().name}" which expected to be "${sHookup.fClass.name}" or its ancestor, but it isn't.`,
                DiagnosticCategory.Warning
            );
        }
    }

    protected checkElement(el: XMLElement) {
        if (!el.stype) return;
        this.svalidator.checkRequiredAttr(el);

        const cDesc = this.index.resolveElementDesc(el);

        if (el.sdef.nodeKind === sch.ElementDefKind.Frame) {
            const sFrameType = this.store.schema.getFrameType(el.stype);
            if (sFrameType && sFrameType.hookups.size > 0) {
                const ufNode = <FrameNode>this.uBuilder.buildNodeFromDesc(cDesc);
                if (ufNode) {
                    this.checkFrameHookups(el, ufNode);
                }
            }
        }

        switch (el.sdef.nodeKind) {
            case sch.ElementDefKind.Frame:
            case sch.ElementDefKind.StateGroup:
            case sch.ElementDefKind.Animation:
            {

                if (el.hasAttribute('file')) {
                    const fileName = el.getAttributeValue('file');
                    const fDesc = this.index.rootNs.get(fileName);
                    if (!fDesc) {
                        this.reportAtAttrVal(el.attributes['file'], `Failed to locate specified File Desc "${fileName}"`);
                    }
                    else {
                        const ufNode = this.uBuilder.buildNodeFromDesc(cDesc);
                        if (!ufNode) {
                            this.reportAtAttrVal(el.attributes['name'], `Failed to locate specified Desc "${cDesc.name}" in File Desc "${fileName}"`);
                        }
                    }
                }

                if (cDesc.xDecls.size > 1 && !el.hasAttribute('file')) {
                    for (const xItem of cDesc.xDecls.values()) {
                        if (xItem === el) continue;
                        if (xItem.getDocument() !== el.getDocument()) continue;
                        if (xItem.start > el.start) continue;
                        this.reportAtNode(el, `Child redeclared - element with that name already exists: "${cDesc.fqn}"`);
                        break;
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
                        this.reportAtAttrName(nattr, `Unexpected attribute "${nattr.name}" - it has no effect on this element.`, DiagnosticCategory.Message);
                    }
                    continue outer;
                }
            }

            const vkind = getAttrValueKind(nattr.value);
            switch (vkind) {
                case AttrValueKind.Constant:
                case AttrValueKind.ConstantRacial:
                // TODO: support ConstantFactional ?
                {
                    const name = nattr.value.substr(vkind === AttrValueKind.ConstantRacial ? 2 : 1);
                    let citem = this.index.constants.get(name);

                    // TODO: dirty hack to not report racial constants as undedclared when there's a match for one of known races
                    if (!citem && vkind === AttrValueKind.ConstantRacial) {
                        for (const race of ['Prot', 'Zerg', 'Terr']) {
                            citem = this.index.constants.get(`${name}_${race}`);
                            if (citem) break;
                        }
                    }

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
                        this.reportAtAttrVal(nattr, `Unknown property "${propBind.property.name}" in property bind expression`, DiagnosticCategory.Message);
                        continue outer;
                    }
                    break;
                }

                case AttrValueKind.Generic:
                {
                    this.checkGenericAttribute(cDesc, nattr, asType);
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
        if (file.getRootNode()) {
            this.checkElement(file.getRootNode());
        }
        else {
            this.reportAt(`Root element ("<Desc>") is missing`, {
                start: file.start,
                end: file.end,
            });
        }
        return this.svalidator.diagnostics.concat(this.diagnostics);
    }
}
