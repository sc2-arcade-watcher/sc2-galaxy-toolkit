import * as sch from '../schema/base.js';
import { XMLElement } from '../types.js';
import { DescIndex } from './desc.js';
import { Store } from './store.js';

export class LayoutProcessor {
    constructor(protected store: Store, protected index: DescIndex) {
    }

    getElPropertyType(el: XMLElement, attrName: string) {
        switch (el.lang.sdef.nodeKind) {
            case sch.ElementDefKind.StateGroupStateCondition:
            case sch.ElementDefKind.StateGroupStateAction:
            {
                switch (el.lang.stype.name) {
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

        const tmpa = el.lang.stype.attributes.get(attrName);
        if (!tmpa) return;
        return tmpa.type;
    }
}
