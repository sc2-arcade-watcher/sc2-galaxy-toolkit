import * as fs from 'fs';
import * as util from 'util';

export const readFileAsync = util.promisify(fs.readFile);
export const fileExistsAsync = util.promisify(fs.exists);

/**
 * Takes a sorted array and a function p. The array is sorted in such a way that all elements where p(x) is false
 * are located before all elements where p(x) is true.
 * @returns the least x for which p(x) is true or array.length if no element fullfills the given function.
 */
export function findFirst<T>(array: T[], p: (x: T) => boolean): number {
    let low = 0, high = array.length;
    if (high === 0) {
        return 0; // no children
    }
    while (low < high) {
        let mid = Math.floor((low + high) / 2);
        if (p(array[mid])) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

export function binarySearch<T>(array: T[], key: T, comparator: (op1: T, op2: T) => number): number {
    let low = 0,
        high = array.length - 1;

    while (low <= high) {
        let mid = ((low + high) / 2) | 0;
        let comp = comparator(array[mid], key);
        if (comp < 0) {
            low = mid + 1;
        } else if (comp > 0) {
            high = mid - 1;
        } else {
            return mid;
        }
    }
    return -(low + 1);
}

//

export function buildMap<T>(obj: {[name: string]: T}) {
    return Object.keys(obj).reduce((map, key) => map.set(key, obj[key]), new Map<string, T>());
}

export function* oentries<T>(obj: T[]) {
    for (const key in obj) {
        yield obj[key];
    }
}

// export function* oventries<T>(obj: T[]) {
//     for (const key in obj) {
//         yield key, obj[key];
//     }
// }

export function* objventries<T>(obj: {[name: string]: T}) {
    for (const key in obj) {
        yield [key, obj[key]];
    }
}

export function *reverseMap<T>(source: ReadonlyMap<string, T>): Iterable<[T,string]> {
    const result: string[] = [];
    for (const [k,v] of source.entries()) {
        yield [v, k];
    }
}
