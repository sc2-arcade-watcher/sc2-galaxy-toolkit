import * as exp from './expressions';

export function getKindName(k: number | string): string {
    if (typeof k === 'string') {
        return k;
    }

    return (<any>exp).SyntaxKind[k];
}
