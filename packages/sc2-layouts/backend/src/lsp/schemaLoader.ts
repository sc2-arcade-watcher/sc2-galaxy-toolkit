import { readSchemaDataDir, createRegistry, createRegistryFromDir } from '../schema/registry';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import extractZip from 'extract-zip';
import { promisify } from 'util';
import { S2LServer } from './server';
import { logger, logIt } from '../logger';
import assert from 'assert';

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

    export type GitTag = {
        message: string;
        node_id: string;
        object: {
            sha: string;
            type: string;
            url: string;
        }
        sha: string;
        tag: string;
        tagger: {
            date: string;
            email: string;
            name: string;
        }
        url: string;
        verification: {
            payload: any
            reason: string;
            signature: any;
            verified: boolean;
        }
    }

    export interface GitRefs {
        node_id: string
        object: {
            sha: string
            type: string
            url: string
        }
        ref: string
        url: string
    }
}

export interface SchemaState {
    cacheFilename: string;
    shortHash: string;
    version: number[];
    gitTag?: IGithub.GitTag;
    lastUpdateCheckTimestamp?: number;
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

    @logIt({ resDump: true })
    protected async getGitRefs(refName: string = '') {
        const r: IGithub.GitRefs[] = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/git/matching-refs/${refName}`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            json: true,
        });
        return r;
    }

    @logIt({ resDump: true })
    protected async getGitTagDetails(sha: string) {
        const r: IGithub.GitTag = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/git/tags/${sha}`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            json: true,
        });
        return r;
    }

    @logIt()
    protected async downloadSchema(gitTag: IGithub.GitTag, version: number[]): Promise<SchemaState> {
        const commitSha = gitTag.sha;
        const shortHash = commitSha.substring(0, 7);
        const zipSrc = path.join(this.tmpPath, `${shortHash}.zip`);
        let zipOutDir = this.tmpPath;

        logger.info(`Clearing tmp..`);
        await fs.remove(this.tmpPath);
        await fs.ensureDir(this.tmpPath);

        logger.info(`Downloading zipball of ${commitSha}`);
        await fs.ensureFile(zipSrc);
        const payload: Buffer = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/zipball/${commitSha}`, {
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
            shortHash: shortHash,
            version: version,
            cacheFilename: cacheFilename,
            gitTag: gitTag,
        };
    }

    @logIt()
    protected async updateSchema(opts: {
        force?: boolean;
        reportStatus?: boolean;
    } = {}) {
        let smState = await this.readSmState();

        let gKnownMinorVersions: {
            version: number;
            gitRef: IGithub.GitRefs;
        }[] = [];
        for (const item of await this.getGitRefs(`tags/v${currentModelVersion}.`)) {
            // expected format: "vX.X"
            const m = item.ref.match(/^refs\/tags\/v(?<majorVersion>\d+)\.(?<minorVersion>\d+)$/);
            if (!m || !m.groups) continue;

            assert.ok(Number(m.groups['majorVersion']) === currentModelVersion);
            gKnownMinorVersions.push({
                version: Number(m.groups['minorVersion']),
                gitRef: item,
            });
        }
        if (gKnownMinorVersions.length === 0) {
            throw new Error(`Couldn't find schema files for v${currentModelVersion} in the repoistory.`);
        }

        gKnownMinorVersions = gKnownMinorVersions.sort((a, b) => a.version - b.version);
        const gLatestVersion = gKnownMinorVersions[gKnownMinorVersions.length - 1];

        const gTag = await this.getGitTagDetails(gLatestVersion.gitRef.object.sha);

        if (
            !smState ||
            opts.force === true ||
            smState.shortHash !== gTag.sha.substring(0, 7)
        ) {
            logger.info(`Schema files are out of date, updating..`);
            smState = await this.downloadSchema(gTag, [currentModelVersion, gLatestVersion.version]);
            smState.lastUpdateCheckTimestamp = Date.now();
            await this.storeSmState(smState);

            const updateDate = new Date(smState.gitTag!.tagger.date);
            logger.info(`Schema files updated to ${smState.gitTag!.tag}, published at ${updateDate.toUTCString()}`);
            if (opts.reportStatus) {
                this.slSrv.conn.window.showInformationMessage(`Schema files updated to ${smState.gitTag!.tag}, published at ${updateDate.toUTCString()}`);
            }

            return {
                smState,
                updated: true,
            };
        }
        else {
            // update check timestamp
            smState.lastUpdateCheckTimestamp = Date.now();
            await this.storeSmState(smState);

            if (opts.reportStatus) {
                this.slSrv.conn.window.showInformationMessage(`Schema files are already up to date.`);
            }

            return {
                smState,
                updated: false,
            };
        }
    }

    public async performUpdate(opts: {
        force?: boolean;
        reportStatus?: boolean;
        skipReloadDialog?: boolean;
    } = {}) {
        try {
            const updateInfo = await this.updateSchema({
                ...opts
            });

            if (updateInfo.updated && ((opts.skipReloadDialog ?? false) !== true)) {
                const decision = await this.slSrv.conn.window.showInformationMessage(
                    (
                        `Schema files have been updated to ` +
                        `"[${updateInfo.smState.gitTag.tag}](https://github.com/${schemaGithubRepo}/releases/tag/${updateInfo.smState.gitTag.tag})".\n` +
                        `Restart is required for changes to take effect.`
                    ),
                    { title: 'Restart' },
                    { title: 'Later' },
                );
                if (decision && decision.title === 'Restart') {
                    process.exit(0);
                }
            }

            return updateInfo;
        }
        catch (err) {
            logger.error('schema update failed', err);
            const decision = await this.slSrv.conn.window.showErrorMessage(
                'Update failed! Check the output panel for details.',
                { title: 'Retry' },
            );
            if (decision?.title === 'Retry') {
                process.exit(0);
            }
            else {
                throw err;
            }
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

            if (smState && (smState.cacheFilename === void 0 || !(await fs.pathExists(path.join(this.cachePath, smState.cacheFilename)))) ) {
                logger.warn(`Cached file no longer exists`, smState.cacheFilename);
                smState = void 0;
                await this.cleanupState();
            }

            if (!smState) {
                const updateInfo = await this.performUpdate({
                    reportStatus: true,
                    force: true,
                    skipReloadDialog: true,
                });
                smState = updateInfo.smState;
            }
            else if (schConfig.updateMode === 'Manual') {
            }
            else if (schConfig.updateMode === 'Auto') {
                const lastUpdateCheckTimestamp = (smState?.lastUpdateCheckTimestamp ?? 0);
                const timeCheckDiff = (Date.now() - lastUpdateCheckTimestamp) / 1000;
                logger.info(`prepareSchema: lastUpdateCheckTimestamp=${lastUpdateCheckTimestamp} timeCheckDiff=${timeCheckDiff}`);
                if (timeCheckDiff >= 3600) {
                    logger.verbose(`preparting to perform check ..`);
                    setTimeout(async () => {
                        await this.performUpdate();
                    }, 15000).unref();
                }
                else {
                    logger.verbose(`skipping update check ..`);
                }
            }
            else {
                logger.warn(`invalid config value for "schema.updateMode"`);
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
