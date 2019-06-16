import * as fs from 'fs-extra';
import * as path from 'path';
import { generateSchema, DefinitionMap } from '../schema/registry';
import { getMdFilenameOfType, defTypeToMdFile, writeMdFile, readMdFile } from '../schema/localization';
import * as sch from '../schema/base';
import { dlog } from '../common';

let sDir: string;

async function updateDocOfType(cType: sch.AbstractModel) {
    const mdFile = defTypeToMdFile(cType);
    const fullFilename = path.join(sDir, 'doc', getMdFilenameOfType(cType));
    await fs.ensureFile(fullFilename);
    await fs.writeFile(fullFilename, writeMdFile(mdFile));
}

async function updateDocFiles() {
    const schemaRegistry = generateSchema(sDir);

    for (const cKind in schemaRegistry.catalog) {
        outer: for (const cType of (<DefinitionMap<sch.AbstractModel>>(<any>schemaRegistry.catalog)[cKind]).values()) {
            switch (cType.smKind) {
                case sch.ModelKind.SimpleType:
                case sch.ModelKind.ComplexType:
                {
                    if ((<sch.SimpleType | sch.ComplexType>cType).flags & sch.CommonTypeFlags.Virtual) {
                        continue outer;
                    }
                    break;
                }
            }
            console.log(getMdFilenameOfType(cType));
            await updateDocOfType(cType);
        }
    }
}

if (process.argv.length < 3) process.exit(1);
sDir = process.argv[2];

updateDocFiles();
