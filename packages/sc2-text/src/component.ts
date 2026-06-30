import { Component, logger, logIt } from 'sc2-mod';
import { LocalizationFile, LocalizationTextStore, LocalizationTriggers } from './store.js';

export class LocalizationComponent extends Component {
    lang = 'enUS';
    triggers = new LocalizationTriggers();
    strings = new Map<string, LocalizationTextStore>();

    private async loadStrings(name: string) {
        const textStore = new LocalizationTextStore();
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles('**/' + this.lang + '.SC2Data/LocalizedData/' + name + 'Strings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
                const locFile = new LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                textStore.merge(locFile);
            }
        }
        this.strings.set(name, textStore);
    }

    @logIt()
    public async loadData() {
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles('**/' + this.lang + '.SC2Data/LocalizedData/TriggerStrings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
                const locFile = new LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                this.triggers.merge(locFile);
            }
        }

        await this.loadStrings('Game');
        await this.loadStrings('Object');

        return true;
    }
}
