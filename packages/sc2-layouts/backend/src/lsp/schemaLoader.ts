import { readSchemaDataDir, createRegistry, createRegistryFromDir } from '../schema/registry';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import * as extractZip from 'extract-zip';
import { S2LServer } from './server';
import { logger, logIt } from '../logger';

const extractZipAsync = util.promisify(extractZip);
const currentModelVersion = 5;

namespace IGithub {
    export interface Author {
        name: string;
        email: string;
        date: string;
    }

    export interface Commit {
        author: Author;
        committer: Author;
        message: string;
    }

    export interface BranchCommit {
        sha: string;
        commit: Commit;
    }

    export namespace Tag {
        export interface Entry {
            name: string;
            zipball_url: string;
            tarball_url: string;
            commit: Commit;
            node_id: string;
        }

        export interface Commit {
            sha: string;
            url: string;
        }
    }
}

export interface SchemaState {
    // srcDir: string;
    cacheFilename: string;
    shortHash: string;
    tag: IGithub.Tag.Entry;
    version: number[];
}

const schemaGithubRepo = 'SC2Mapster/sc2layout-schema';

function sanitizeCommitMessage(msg: string) {
    msg = msg.split('\n')[0].trim();
    if (msg.length > 50) {
        msg = msg.substr(0, 48) + '..';
    }
    return msg;
}

export class SchemaLoader {
    constructor(protected slSrv: S2LServer) {
    }

    protected async readSmState() {
        const schStateSrc = path.join(this.slSrv.initOptions.globalStoragePath, 'sch-state.json');
        return await fs.readJSON(schStateSrc) as SchemaState;
    }

    protected async storeSmState(smState: SchemaState) {
        const schStateSrc = path.join(this.slSrv.initOptions.globalStoragePath, 'sch-state.json');
        await fs.writeJSON(schStateSrc, smState);
    }

    @logIt({ resDump: true })
    protected async getMostRecentCommit() {
        const r = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/branches/master`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            json: true,
        });
        return <IGithub.BranchCommit>r.commit;
    }

    @logIt({ resDump: true })
    protected async getTags() {
        const r: IGithub.Tag.Entry[] = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/tags`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            json: true,
        });
        return r;
    }

    @logIt()
    protected async downloadSchema(gTag: IGithub.Tag.Entry, version: number[]): Promise<SchemaState> {
        const shortHash = gTag.commit.sha.substr(0, 7);
        const tmpPath = path.join(this.slSrv.initOptions.globalStoragePath, 'tmp');
        const zipSrc = path.join(tmpPath, `${shortHash}.zip`);
        let outDir = tmpPath;

        logger.info(`[SchemaLoader] Clearing tmp..`);
        await fs.remove(tmpPath);
        await fs.ensureDir(tmpPath);

        logger.info(`[SchemaLoader] downloading zipball of ${gTag.commit.sha}`);
        await fs.ensureFile(zipSrc);
        const payload: Buffer = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/zipball/${gTag.commit.sha}`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            encoding: null,
        });
        await fs.writeFile(zipSrc, payload);

        logger.info(`[SchemaLoader] extracting zip..`);
        await extractZipAsync(zipSrc, {
            dir: outDir,
            defaultFileMode: 0o444,
            onEntry: (entry, zipFile) => {
                logger.info(`[SchemaLoader] extracting file "${entry.fileName}" ..`);
            }
        });
        logger.info(`[SchemaLoader] all files extracted`);
        await fs.remove(zipSrc);
        outDir = path.join(outDir, `${schemaGithubRepo.replace('/', '-')}-${shortHash}`);

        logger.info(`[SchemaLoader] reading from dir..`);
        const sData = await readSchemaDataDir(path.join(outDir, 'sc2layout'));
        await fs.remove(outDir);

        logger.info(`[SchemaLoader] caching..`);
        const cacheFilename = `sch-cache-${shortHash}.json`;
        await fs.writeJSON(path.join(this.slSrv.initOptions.globalStoragePath, cacheFilename), sData);

        return {
            tag: gTag,
            shortHash: shortHash,
            version: version,
            cacheFilename: cacheFilename,
        };
    }

    @logIt()
    protected async updateSchema(reportStatus: boolean = false) {
        if (reportStatus) {
            this.slSrv.conn.window.showInformationMessage('SC2 Layout: checking if schema files are up to date..');
        }

        let smState = await this.readSmState();

        let gTag: IGithub.Tag.Entry;
        let gVersion: number[];
        for (const item of await this.getTags()) {
            // format vX.X
            gVersion = item.name.substr(1).split('.').map(v => Number(v));
            if (gVersion[0] === currentModelVersion) {
                gTag = item;
                break;
            }
        }

        if (gTag === void 0) {
            throw new Error(`Couldn't find schema files for v${currentModelVersion} in the repoistory.`);
        }

        if (!smState || smState.tag.name !== gTag.name) {
            logger.info(`[SchemaLoader] schema files are out of date, updating..`);
            logger.info('SC2 Layout: schema files are out of date, updating..');
            smState = await this.downloadSchema(gTag, gVersion);
            this.storeSmState(smState);
            logger.info(`SC2 Layout: schema files updated to ${smState.tag.name}`);
            this.slSrv.conn.window.showInformationMessage(`SC2 Layout: schema files updated to ${smState.tag.name}`);
            return smState;
        }
        else {
            logger.info(`[SchemaLoader] schema files are up to date`);
        }
    }

    public async performUpdate(reportStatus: boolean = false) {
        const smState = await this.updateSchema(reportStatus);

        if (smState) {
            const decision = await this.slSrv.conn.window.showInformationMessage(
                (
                    `Schema files have been updated to ` +
                    `"[${smState.tag.name}](https://github.com/${schemaGithubRepo}/releases/tag/${smState.tag.name})".\n` +
                    `Restart is required for changes to take effect.`
                ),
                { title: 'Restart' },
                { title: 'Later' },
            );
            if (decision && decision.title === 'Restart') {
                process.exit(0);
            }
        }
    }

    async prepareSchema() {
        const schConfig = this.slSrv.cfg.schema;

        if (typeof schConfig.localPath === 'string') {
            logger.info('[SchemaLoader] using custom path', schConfig.localPath);
            return await createRegistryFromDir(path.join(schConfig.localPath, 'sc2layout'));
        }
        else {
            let smState = await this.readSmState();
            logger.info('[SchemaLoader] state', smState);

            if (smState && (smState.cacheFilename === void 0 || !(await fs.pathExists(path.join(this.slSrv.initOptions.globalStoragePath, smState.cacheFilename)))) ) {
                logger.warn(`[SchemaLoader] cached file no longer exists`, smState.cacheFilename);
                smState = void 0;
                await this.storeSmState(smState);
            }

            if (!smState) {
                smState = await this.updateSchema(true);
            }
            else if (schConfig.updateMode === 'Auto') {
                this.performUpdate();
            }

            logger.info(`[SchemaLoader] loading from`, path.join(this.slSrv.initOptions.globalStoragePath, smState.cacheFilename));
            return createRegistry(await fs.readJSON(path.join(this.slSrv.initOptions.globalStoragePath, smState.cacheFilename)));
        }
    }
}
