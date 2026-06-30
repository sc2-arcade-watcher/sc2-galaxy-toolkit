import { Component, logger, logIt } from 'sc2-mod';
import { TriggerStore, XMLReader } from './store.js';

export class TriggerComponent extends Component {
    protected store = new TriggerStore();

    @logIt()
    public async loadData() {
        const trigReader = new XMLReader(this.store);

        for (const archive of this.workspace.metadataArchives) {
            for (const filename of await archive.findFiles('**/*.{TriggerLib,SC2Lib}')) {
                logger.debug(`:: ${archive.name}/${filename}`);
                this.store.addLibrary(await trigReader.loadLibrary(await archive.readFile(filename)));
            }
            if (await archive.hasFile('Triggers')) {
                logger.debug(`:: ${archive.name}/Triggers`);
                await trigReader.load(await archive.readFile('Triggers'), this.workspace.rootArchive !== archive);
            }
        }

        return true;
    }

    public getStore() {
        return this.store;
    }
}
