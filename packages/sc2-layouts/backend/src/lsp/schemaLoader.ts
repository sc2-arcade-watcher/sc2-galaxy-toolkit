import { readSchemaDataDir, createRegistry, createRegistryFromDir } from '../schema/registry';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import extractZip from 'extract-zip';
import { promisify } from 'util';
import { S2LServer } from './server';
import { logger, logIt } from '../logger';

const extractZipAsync = promisify(extractZip);
const currentModelVersion = 6;

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
    protected storagePath = this.slSrv.initOptions.globalStoragePath;
    protected tmpPath = path.join(this.storagePath, 'tmp');
    protected cachePath = path.join(this.storagePath, 'cache');
    readonly schStateSrc = path.join(this.storagePath, 'sch-state.json');

    constructor(protected slSrv: S2LServer) {
    }

    protected async readSmState() {
        if (await fs.pathExists(this.schStateSrc)) {
            return await fs.readJSON(this.schStateSrc) as SchemaState;
        }
    }

    protected async storeSmState(smState: SchemaState) {
        await fs.writeJSON(this.schStateSrc, smState);
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
        const zipSrc = path.join(this.tmpPath, `${shortHash}.zip`);
        let zipOutDir = this.tmpPath;

        logger.info(`Clearing tmp..`);
        await fs.remove(this.tmpPath);
        await fs.ensureDir(this.tmpPath);

        logger.info(`Downloading zipball of ${gTag.commit.sha}`);
        await fs.ensureFile(zipSrc);
        const payload: Buffer = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/zipball/${gTag.commit.sha}`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            encoding: null,
        });
        await fs.writeFile(zipSrc, payload);

        logger.info(`Extracting zip..`);
        await extractZipAsync(zipSrc, {
            dir: zipOutDir,
            defaultFileMode: 0o444,
            onEntry: (entry, zipFile) => {
                logger.info(`Extracting file "${entry.fileName}" ..`);
            }
        });
        logger.info(`All files extracted`);
        await fs.remove(zipSrc);
        zipOutDir = path.join(zipOutDir, `${schemaGithubRepo.replace('/', '-')}-${shortHash}`);

        logger.info(`Reading from dir..`);
        const sData = await readSchemaDataDir(path.join(zipOutDir, 'sc2layout'));
        await fs.remove(zipOutDir);

        logger.info(`Caching..`);
        const cacheFilename = `sch-bundle-v${version.join('.')}-${shortHash}.json`;
        await fs.ensureDir(this.cachePath);
        await fs.writeJSON(path.join(this.cachePath, cacheFilename), sData);

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
            this.slSrv.conn.window.showInformationMessage('Updating sc2layout schema files..');
        }

        let smState = await this.readSmState();

        let gTag: IGithub.Tag.Entry;
        let gVersion: number[];
        for (const item of await this.getTags()) {
            // expected format: "vX.X"
            const m = item.name.match(/^v(?<majorVersion>\d+)\.(?<minorVersion>\d+)$/);
            if (!m || !m.groups) continue;

            gVersion = [Number(m[1]), Number(m[2])];
            if (gVersion[0] === currentModelVersion) {
                gTag = item;
                break;
            }
        }

        if (gTag === void 0) {
            throw new Error(`Couldn't find schema files for v${currentModelVersion} in the repoistory.`);
        }

        if (!smState || smState.tag.name !== gTag.name) {
            logger.info(`Schema files are out of date, updating..`);
            smState = await this.downloadSchema(gTag, gVersion);
            this.storeSmState(smState);
            logger.info(`schema files updated to ${smState.tag.name}`);
            if (reportStatus) {
                this.slSrv.conn.window.showInformationMessage(`Schema files updated to ${smState.tag.name}`);
            }
            return smState;
        }
        else {
            if (reportStatus) {
                this.slSrv.conn.window.showInformationMessage(`Schema files are already up to date.`);
            }
        }
    }

    public async performUpdate(reportStatus: boolean = false) {
        try {
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
        catch (err) {
            this.slSrv.conn.window.showErrorMessage('Update failed! Check the output panel for details.');
            throw err;
        }
    }

    public get isUsingLocalSchema() {
        return typeof this.slSrv.cfg.schema.localPath === 'string';
    }

    async prepareSchema() {
        const schConfig = this.slSrv.cfg.schema;

        if (this.isUsingLocalSchema) {
            logger.info('[SchemaLoader] using custom path', schConfig.localPath);
            return createRegistryFromDir(path.join(schConfig.localPath, 'sc2layout'));
        }
        else {
            let smState = await this.readSmState();
            logger.info('[SchemaLoader] state', smState);

            if (smState && smState.version[0] < currentModelVersion) {
                if (smState.version[0] <= 5) {
                    // cleanup forgotten junk from old versions
                    await fs.remove(this.storagePath);
                }
                smState = void 0;
            }

            if (smState && (smState.cacheFilename === void 0 || !(await fs.pathExists(path.join(this.cachePath, smState.cacheFilename)))) ) {
                logger.warn(`Cached file no longer exists`, smState.cacheFilename);
                smState = void 0;
            }

            if (!smState) {
                smState = await this.updateSchema(true);
            }
            else if (schConfig.updateMode === 'Manual') {
            }
            else if (schConfig.updateMode === 'Auto') {
                this.performUpdate();
            }
            else {
                logger.warn(`invalid config value for "schema.updateMode"`);
                this.performUpdate();
            }

            logger.info(`Loading from`, path.join(this.cachePath, smState.cacheFilename));
            return createRegistry(await fs.readJSON(path.join(this.cachePath, smState.cacheFilename)));
        }
    }

    async cleanupState() {
        if (!this.isUsingLocalSchema) return;
        (await fs.pathExists(this.schStateSrc)) && (await fs.remove(this.schStateSrc));
    }
}
