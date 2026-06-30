import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import * as path from 'path';
import { Component, SC2Archive, logger, logIt } from 'sc2-mod';
import { CatalogStore } from './store.js';

export class CatalogComponent extends Component {
    protected store = new CatalogStore();

    @logIt()
    public async loadData() {
        for await (const [archive, filename] of this.workspace.findFiles('**/GameData/**/*.xml')) {
            logger.debug(`:: ${archive.name}/${filename}`);
            const doc = TextDocument.create(
                URI.file(path.join(archive.directory, filename)).toString(),
                'xml',
                0,
                await archive.readFile(filename)
            );
            this.store.update(doc, archive);
        }
        return true;
    }

    public getStore() {
        return this.store;
    }
}
