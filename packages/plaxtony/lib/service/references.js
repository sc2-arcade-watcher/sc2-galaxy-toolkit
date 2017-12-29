"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
const gt = require("../compiler/types");
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const checker_1 = require("../compiler/checker");
const lib_1 = require("vscode-uri/lib");
;
class ReferencesProvider extends provider_1.AbstractProvider {
    constructor() {
        super();
        this.locations = [];
        this.config = {
            currentWorkspaceOnly: false,
        };
    }
    collectReferences(sourceFile, child) {
        if (child.kind === 107 /* Identifier */ && this.checker.getSymbolAtLocation(child) === this.searchSymbol) {
            this.locations.push({
                uri: sourceFile.fileName,
                range: {
                    start: utils_2.getLineAndCharacterOfPosition(sourceFile, child.pos),
                    end: utils_2.getLineAndCharacterOfPosition(sourceFile, child.end),
                }
            });
        }
        utils_1.forEachChild(child, (node) => {
            this.collectReferences(sourceFile, node);
        });
    }
    onReferences(params, currentWorkspaceOnly) {
        this.locations = [];
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile)
            return;
        const position = utils_2.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = utils_2.getAdjacentIdentfier(position, sourceFile);
        if (!currentToken) {
            return null;
        }
        this.checker = new checker_1.TypeChecker(this.store);
        this.searchSymbol = this.checker.getSymbolAtLocation(currentToken);
        if (!this.searchSymbol) {
            return null;
        }
        for (const sourceFile of this.store.documents.values()) {
            if ((this.config.currentWorkspaceOnly || currentWorkspaceOnly === true) &&
                (!this.store.rootPath || !lib_1.default.parse(sourceFile.fileName).fsPath.startsWith(this.store.rootPath)) &&
                !this.store.openDocuments.has(sourceFile.fileName)) {
                continue;
            }
            this.collectReferences(sourceFile, sourceFile);
        }
        return this.locations;
    }
}
exports.ReferencesProvider = ReferencesProvider;
//# sourceMappingURL=references.js.map