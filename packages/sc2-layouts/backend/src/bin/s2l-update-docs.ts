import * as fs from 'fs-extra';
import * as path from 'path';
import { createRegistryFromDir, DefinitionMap } from '../schema/registry';
import { getMdFilenameOfType, defTypeToMdFile, writeMdFile, readMdFile } from '../schema/localization';
import * as sch from '../schema/base';
import { dlog, globify } from '../common';

function getRelativeFilenameForType(cType: sch.AbstractModel) {
    return path.join('doc', getMdFilenameOfType(cType));
}

async function updateDocOfType(sDir: string, cType: sch.AbstractModel, dryRun = false) {
    const mdFile = defTypeToMdFile(cType);
    const fullFilename = path.join(sDir, getRelativeFilenameForType(cType));

    const updatedContent = writeMdFile(mdFile);
    let currentContent = '';
    if (await fs.pathExists(fullFilename)) {
        currentContent = await fs.readFile(fullFilename, 'utf8');
    }
    else {
        if (dryRun) {
            return true;
        }
        await fs.ensureFile(fullFilename);
    }

    if (currentContent.trim() !== updatedContent.trim()) {
        if (dryRun) {
            return true;
        }
        await fs.writeFile(fullFilename, updatedContent);
        return true;
    }
    else {
        return false;
    }
}

async function updateDocFiles(sDir: string, dryRun: boolean) {
    if (dryRun) {
        console.log('Peforming dry run..');
    }

    const schemaRegistry = await createRegistryFromDir(sDir);

    const existingDocs = new Set(await globify(`doc/@(${sch.ModelKind.SimpleType}|${sch.ModelKind.ComplexType})/**/*.md`, {
        cwd: sDir,
        nodir: true,
    }));

    for (const cKind in schemaRegistry.catalog) {
        const defMap: DefinitionMap<sch.SimpleType | sch.ComplexType> = ((<any>schemaRegistry.catalog)[cKind]);
        outer: for (const cType of defMap.values()) {
            switch (cType.smKind) {
                case sch.ModelKind.SimpleType:
                case sch.ModelKind.ComplexType: {
                    if (cType.flags & sch.CommonTypeFlags.Virtual) {
                        continue outer;
                    }
                    break;
                }
            }
            existingDocs.delete(getRelativeFilenameForType(cType));
            if (await updateDocOfType(sDir, cType, dryRun)) {
                console.log(`[UPDATED] ${getMdFilenameOfType(cType)}`);
            }
        }
    }

    for (const item of existingDocs) {
        if (!dryRun) {
            await fs.remove(path.join(sDir, item));
        }
        console.log(`[REMOVED] ${item}`);
    }
}

// argv3 optional
if (process.argv.length < 3) throw new Error('missing required args');
updateDocFiles(process.argv[2], process.argv[3] === 'force' ? false : true);
