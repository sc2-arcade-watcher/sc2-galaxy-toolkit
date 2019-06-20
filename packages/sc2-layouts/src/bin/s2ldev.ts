import * as fs from 'fs-extra';
import * as path from 'path';
import { createRegistryFromDir, DefinitionMap, readSchemaDataDir } from '../schema/registry';
import { getMdFilenameOfType, defTypeToMdFile, writeMdFile, readMdFile } from '../schema/localization';
import * as sch from '../schema/base';
import { dlog } from '../common';

// ===
// doc files

async function updateDocOfType(sDir: string, cType: sch.AbstractModel) {
    const mdFile = defTypeToMdFile(cType);
    const fullFilename = path.join(sDir, 'doc', getMdFilenameOfType(cType));
    await fs.ensureFile(fullFilename);
    await fs.writeFile(fullFilename, writeMdFile(mdFile));
}

async function updateDocFiles(sDir: string) {
    const schemaRegistry = await createRegistryFromDir(sDir);

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
            await updateDocOfType(sDir, cType);
        }
    }
}

// ===
// schema cache

async function cacheSchema(sDir: string, targetFilename: string) {
    const sData = await readSchemaDataDir(sDir, { includeLocalization: false });
    await fs.ensureFile(targetFilename);
    await fs.writeJSON(targetFilename, sData);
}

// ===
// run

if (process.argv.length < 3) process.exit(1);

switch (process.argv[2]) {
    case 'doc':
    {
        if (process.argv.length < 4) process.exit(1);
        updateDocFiles(process.argv[3]);
        break;
    }

    case 'cache':
    {
        if (process.argv.length < 5) process.exit(1);
        cacheSchema(process.argv[3], process.argv[4]);
        break;
    }
}

console.info('Done');
