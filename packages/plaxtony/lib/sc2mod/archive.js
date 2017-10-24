"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const trig = require("./trigger");
const localization_1 = require("./localization");
function isSC2Archive(directory) {
    return /\.(SC2Mod|SC2Map|SC2Campaign)$/i.exec(path.basename(directory));
}
exports.isSC2Archive = isSC2Archive;
function findSC2Archives(directory) {
    return new Promise((resolve, reject) => {
        glob(path.join(directory, '**/*.+(SC2Mod|SC2Map|SC2Campaign)'), { nocase: true, realpath: true }, (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches.filter((value) => {
                    return fs.lstatSync(value).isDirectory();
                }));
            }
        });
    });
}
exports.findSC2Archives = findSC2Archives;
function findSC2File(directory, pattern) {
    return new Promise((resolve, reject) => {
        glob(path.join('**/' + pattern), { nocase: true, realpath: true, nodir: true, cwd: directory }, (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}
class SC2Archive {
    constructor() {
        this.trigLibs = new trig.LibraryContainer();
        this.trigStrings = new localization_1.LocalizationFile();
    }
    openFromDirectory(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            this.directory = path.resolve(directory);
            for (const filename of yield findSC2File(this.directory, '+(*.TriggerLib|*.SC2Lib)')) {
                this.trigLibs.addFromFile(filename);
            }
            const filenames = yield findSC2File(this.directory, path.join('TriggerStrings.txt'));
            if (filenames.length) {
                this.trigStrings.readFromFile(filenames[0]);
            }
        });
    }
}
exports.SC2Archive = SC2Archive;
//# sourceMappingURL=archive.js.map