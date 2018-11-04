import * as sch from '../schema/base';
import { XMLElement } from '../types';
import { DescIndex } from './desc';
import { Store } from './store';

export class LayoutProcessor {
    constructor(protected store: Store, protected index: DescIndex) {
    }

    getElPropertyType(el: XMLElement, attrName: string) {
        switch (el.sdef.nodeKind) {
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

            default:
            {
                const tmpa = el.stype.attributes.get(attrName);
                if (!tmpa) break;
                return tmpa.type;
            }
        }
    }
}
