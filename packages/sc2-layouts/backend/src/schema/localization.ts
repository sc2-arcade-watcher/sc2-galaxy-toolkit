import * as path from 'path';
import * as sch from './base';
import { objventries } from '../common';

interface MdNamedEntry {
    title?: string;
    content?: string;
}

type MdNamedEntries = {[name: string]: MdNamedEntry};

interface MdFileContent {
    title?: string;
    content?: string;
    entries: MdNamedEntries[];
}

const placeholderStr = 'TBD';

export function getMdFilenameOfType(def: sch.AbstractModel) {
    return path.join(def.smKind, `${def.name.replace(/[:]/g, '.')}.md`);
}

export function defTypeToMdFile(def: sch.AbstractModel, mContent?: MdFileContent) {
    if (mContent === void 0) {
        mContent = {
            entries: [],
        };
    }

    switch (def.smKind) {
        case sch.ModelKind.FrameType:
        {
            mContent.title = (<sch.FrameType>def).complexType.label;
            mContent.content = (<sch.FrameType>def).complexType.documentation;
            break;
        }

        case sch.ModelKind.FrameClass:
        {
            break;
        }

        default:
        {
            mContent.title = (<any>def).label;
            mContent.content = (<any>def).documentation;
            break;
        }
    }

    switch (def.smKind) {
        case sch.ModelKind.SimpleType:
        case sch.ModelKind.ComplexType:
        case sch.ModelKind.Element:
        case sch.ModelKind.FrameType:
        {
            if (!mContent.title) {
                mContent.title = placeholderStr;
            }
            break;
        }
    }

    switch (def.smKind) {
        case sch.ModelKind.SimpleType:
        {
            const cSimple = <sch.SimpleType>def;
            if (!cSimple.emap) break;

            const mdProperties = <MdNamedEntries>{};
            mContent.entries.push(mdProperties);
            for (const item of cSimple.emap.values()) {
                mdProperties[item.name] = {
                    title: item.label,
                };
            }
            break;
        }

        case sch.ModelKind.FrameClass:
        {
            const fClass = <sch.FrameClass>def;

            const mdProperties = <MdNamedEntries>{};
            mContent.entries.push(mdProperties);
            for (const item of fClass.properties.values()) {
                mdProperties[item.name] = {
                    title: item.etype.label,
                    content: item.etype.documentation,
                };
            }

            break;
        }

        case sch.ModelKind.ComplexType:
        case sch.ModelKind.Element:
        {
            const cType = <sch.ComplexType & sch.ElementDef>def;

            const mdAttrs = <MdNamedEntries>{};
            mContent.entries.push(mdAttrs);
            for (const item of cType.origin.attrs.values()) {
                mdAttrs[item.name] = {
                    title: item.label,
                    content: item.documentation,
                };
            }

            const mdElements = <MdNamedEntries>{};
            mContent.entries.push(mdElements);
            for (const item of cType.origin.elements.values()) {
                mdElements[item.name] = {
                    title: item.label,
                    content: item.documentation,
                };
            }

            break;
        }
    }

    return mContent;
}

export function mdContentToDef(def: sch.AbstractModel, mContent: MdFileContent) {
    switch (def.smKind) {
        case sch.ModelKind.FrameType:
        {
            (<sch.FrameType>def).complexType.label = mContent.title;
            (<sch.FrameType>def).complexType.documentation = mContent.content;
            break;
        }

        case sch.ModelKind.FrameClass:
        {
            break;
        }

        default:
        {
            (<any>def).label = mContent.title;
            (<any>def).documentation = mContent.content;
            break;
        }
    }

    switch (def.smKind) {
        case sch.ModelKind.SimpleType:
        {
            const cSimple = <sch.SimpleType>def;
            if (!cSimple.emap) break;

            const mdProperties = mContent.entries[0];
            if (!mdProperties) break;

            for (const item of cSimple.emap.values()) {
                const cProp = mdProperties[item.name];
                if (cProp === void 0) continue;
                item.label = cProp.title;
            }
            break;
        }

        case sch.ModelKind.FrameClass:
        {
            const fClass = <sch.FrameClass>def;

            const mdProperties = mContent.entries[0];
            if (!mdProperties) break;

            for (const item of fClass.properties.values()) {
                const cProp = mdProperties[item.name];
                if (cProp === void 0) continue;
                item.etype.label = cProp.title;
                item.etype.documentation = cProp.content;
            }

            break;
        }

        case sch.ModelKind.ComplexType:
        case sch.ModelKind.Element:
        {
            const cType = <sch.ComplexType & sch.ElementDef>def;

            const mdAttrs = mContent.entries[0];
            if (!mdAttrs) break;

            for (const item of cType.origin.attrs.values()) {
                const cProp = mdAttrs[item.name];
                if (cProp === void 0) continue;
                item.label = cProp.title;
                item.documentation = cProp.content;
            }

            const mdElements = mContent.entries[1];
            if (!mdElements) break;

            for (const item of cType.origin.elements.values()) {
                const cProp = mdElements[item.name];
                if (cProp === void 0) continue;
                item.label = cProp.title;
                item.documentation = cProp.content;
            }

            break;
        }
    }

    return def;
}

export function writeMdFile(mContent: MdFileContent) {
    const output: string[] = [];

    if (mContent.title !== void 0) output.push(mContent.title);
    if (mContent.content !== void 0) output.push(mContent.content);

    for (const entries of mContent.entries) {
        output.push('___');
        for (const [key, item] of objventries(entries)) {
            output.push(`## ${key}`);
            if (item.title !== void 0) {
                output.push(item.title);
            }
            else {
                output.push(placeholderStr);
            }
            if (item.content !== void 0) output.push(item.content);
        }
    }

    if (output.length && !output[output.length - 1].match(/\n$/)) {
        output[output.length - 1] += '\n';
    }

    return output.join('\n\n');
}

const reBeginsWithHashSign = /^#+\s+(.+)\s*/;
const reEntryHead = /(?:^|\n+)## ([^\n]+)(?:\n|$)/;
const reEntryTitle = /^\n((?!#).+)(?:\n|$)/;
const reEntryContent = /^\n((?!#)[^]+?)(?:\n## |$)/;

export function readMdFile(input: string) {
    const mContent: MdFileContent = {
        entries: [],
    };
    const sections = input.split(/^___\n{0,2}/gm);

    if (sections.length === 0) return;

    if (sections[0].length > 0) {
        const paragraphs = sections[0].split('\n\n');

        // use a leading paragraph as "title" - an intro to the content
        if (paragraphs.length > 0 && !paragraphs[0].match(reBeginsWithHashSign)) {
            if (paragraphs[0] !== placeholderStr) {
                mContent.title = paragraphs[0];
            }
            paragraphs.splice(0, 1);
        }

        // use the remaining of the section to fill the content
        if (paragraphs.length > 0) {
            mContent.content = paragraphs.join('\n\n').trimRight();
            if (!mContent.content.length) {
                mContent.content = void 0;
            }
        }
    }

    for (let i = 1; i < sections.length; i++) {
        const mEntries = <MdNamedEntries>{};
        mContent.entries.push(mEntries);

        let buff = sections[i];
        let matches: RegExpMatchArray;
        while (matches = buff.match(reEntryHead)) {
            const key = matches[1];
            const entry: MdNamedEntry = {};
            mEntries[key] = entry;

            buff = buff.substr(matches[0].length);
            matches = buff.match(reEntryTitle);
            if (!matches) continue;

            if (matches[1] !== placeholderStr) entry.title = matches[1];
            buff = buff.substr(matches[0].length);

            matches = buff.match(reEntryContent);
            if (!matches) continue;
            entry.content = matches[1].trimRight();

            buff = buff.substr(matches[1].length);
        }
    }

    return mContent;
}

export type MdFileStorage = {[name: string]: MdFileContent};

export async function readMdStorage(sfProvider: sch.SchemaFileProvider) {
    const mRegistry: MdFileStorage = {};

    for (const filename of await sfProvider.listDir('doc/**/*.md')) {
        const mFile = readMdFile(await sfProvider.readFile(filename));
        mRegistry[filename.substr(4)] = mFile;
    }

    return mRegistry;
}
