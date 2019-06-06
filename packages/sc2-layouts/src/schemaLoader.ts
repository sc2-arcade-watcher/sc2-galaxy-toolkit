import { ServiceContext, ExtCfgSchemaUpdateMode } from './service';
import { generateSchema } from './schema/map';
import * as vs from 'vscode';
import * as request from 'request-promise-native';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import * as extractZip from 'extract-zip';
import { IService, ILoggerConsole, svcRequest } from './services/provider';

const extractZipAsync = util.promisify(extractZip);

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
}

export interface SchemaState {
    srcDir: string;
    shortHash: string;
    commit: IGithub.BranchCommit;
}

const schemaGithubRepo = 'SC2Mapster/sc2layout-schema';

function sanitizeCommitMessage(msg: string) {
    msg = msg.split('\n')[0].trim();
    if (msg.length > 50) {
        msg = msg.substr(0, 48) + '..';
    }
    return msg;
}

export class SchemaLoader implements IService, vs.Disposable {
    console: ILoggerConsole;
    subscriptions: { dispose(): any }[] = [];

    constructor(protected sCtx: ServiceContext) {
        this.console = sCtx.console;
        this.subscriptions.push(vs.commands.registerCommand('sc2layout.updateSchemaFiles', this.performUpdate.bind(this, true)));
    }

    dispose() {
        this.subscriptions.forEach(i => i.dispose());
        this.subscriptions = [];
    }

    protected async getMostRecentCommit() {
        this.console.log(`[SchemaLoader] getMostRecentCommit`);
        const r = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/branches/master`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            json: true,
        });
        this.console.log(`[SchemaLoader] getMostRecentCommit result`, (<IGithub.BranchCommit>r.commit).commit);
        return <IGithub.BranchCommit>r.commit;
    }

    protected async downloadSchema(bCommit: IGithub.BranchCommit): Promise<SchemaState> {
        const shortHash = bCommit.sha.substr(0, 7);
        const zipSrc = path.join(this.sCtx.extContext.globalStoragePath, 'tmp', `${shortHash}.zip`);
        const outDir = path.join(
            this.sCtx.extContext.globalStoragePath,
            `${schemaGithubRepo.replace('/', '-')}-${shortHash}`
        );

        this.console.log(`[SchemaLoader] downloading zipball of ${bCommit.sha}`);
        await fs.ensureFile(zipSrc);
        const payload: Buffer = await request.get(`https://api.github.com/repos/${schemaGithubRepo}/zipball/${bCommit.sha}`, {
            headers: {
                'User-Agent': 'nodejs request'
            },
            encoding: null,
        });
        await fs.writeFile(zipSrc, payload);

        this.console.log(`[SchemaLoader] extracting zip (${Buffer.length} bytes)`);
        await fs.remove(outDir);
        await extractZipAsync(zipSrc, {
            dir: this.sCtx.extContext.globalStoragePath,
            defaultFileMode: 0o444,
            onEntry: (entry, zipFile) => {
                this.console.log(`[SchemaLoader] extracting file "${entry.fileName}" ..`);
            }
        });
        this.console.log(`[SchemaLoader] all files extracted`);
        await fs.remove(zipSrc);

        return {
            commit: bCommit,
            shortHash: shortHash,
            srcDir: outDir,
        };
    }

    @svcRequest()
    protected async updateSchema(reportStatus: boolean = false) {
        let sbTmp: vs.Disposable;
        if (reportStatus) {
            sbTmp = vs.window.setStatusBarMessage('SC2 Layout: checking if schema files are up to date..');
        }

        let smState = <SchemaState>this.sCtx.extContext.globalState.get('schema');
        const bCommit = await this.getMostRecentCommit();

        if (sbTmp) sbTmp.dispose();

        if (!smState || smState.commit.sha !== bCommit.sha) {
            this.console.log(`[SchemaLoader] schema files are out of date, updating..`);
            sbTmp = vs.window.setStatusBarMessage('SC2 Layout: schema files are out of date, updating..');
            smState = await this.downloadSchema(bCommit);
            this.sCtx.extContext.globalState.update('schema', smState);
            sbTmp.dispose();
            vs.window.setStatusBarMessage(`SC2 Layout: schema files updated to ${smState.commit.sha}`, 5000);
            return smState;
        }
        else {
            this.console.log(`[SchemaLoader] schema files are up to date`);
            vs.window.setStatusBarMessage(`SC2 Layout: schema files are up to date`, 5000);
        }
    }

    protected async performUpdate(reportStatus: boolean = false) {
        const smState = await this.updateSchema(reportStatus);

        if (smState) {
            const bCommit = smState.commit;
            const decision = await vs.window.showInformationMessage(
                (
                    `Schema files have been updated to ` +
                    `"[${sanitizeCommitMessage(bCommit.commit.message)}](https://github.com/${schemaGithubRepo}/commit/${bCommit.sha})", ` +
                    `commited at ${bCommit.commit.committer.date} by [${bCommit.commit.committer.name}](https://github.com/${bCommit.commit.committer.name}).\n` +
                    `Restart is required for changes to take effect.`
                ),
                {
                    modal: false,
                },
                'Restart',
                'Later'
            );
            if (decision === 'Restart') {
                vs.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
    }

    protected loadFromDir(src: string) {
        this.console.info(`[SchemaLoader] loading from "${src}"`);
        return generateSchema(src);
    }

    async prepareSchema() {
        const schConfig = this.sCtx.config.schema;
        let schemaDir: string;

        if (typeof schConfig.localPath === 'string') {
            this.console.info('[SchemaLoader] using custom path');
            schemaDir = schConfig.localPath;
        }
        else {
            let smState = <SchemaState>this.sCtx.extContext.globalState.get('schema');
            this.console.log('[SchemaLoader] state', smState);

            if (smState && !(await fs.pathExists(smState.srcDir))) {
                this.console.warn(`[SchemaLoader] local srcDir no longer exists "${smState.srcDir}"`);
                smState = void 0;
                this.sCtx.extContext.globalState.update('schema', smState);
            }

            if (!smState) {
                smState = await this.updateSchema(true);
            }
            else if (schConfig.updateMode === ExtCfgSchemaUpdateMode.Auto) {
                this.performUpdate();
            }
            schemaDir = smState.srcDir;
        }

        return this.loadFromDir(path.join(schemaDir, 'sc2layout'));
    }
}
