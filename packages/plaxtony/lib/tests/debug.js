"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../src/compiler/parser");
const store_1 = require("../src/service/store");
const utils_1 = require("../src/compiler/utils");
const path = require("path");
const fs = require("fs");
it('dbg', () => {
    const parser = new parser_1.Parser();
    // const document = createTextDocumentFromFs('tests/fixtures/parser/typedef.galaxy');
    // const sourceFile = parser.parseFile(document.uri, document.getText());
    const filename = 'incomplete_if_identifier.galaxy';
    const document = store_1.createTextDocumentFromFs(path.join('tests/fixtures/type_checker/find', filename));
    const sourceFile = parser.parseFile(filename, document.getText());
    // console.log(sourceFile.parseDiagnostics);
    fs.writeFileSync('tests/tmp/' + filename + '.json', utils_1.sourceFileToJSON(sourceFile));
    // function b() {
    //     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    //         let method = (<Function>descriptor.value);
    //         descriptor.value = function() {
    //             console.log('before');
    //             method.bind(this)(...arguments);
    //             console.log('after');
    //             // this.c();
    //         }
    //     }
    // }
    // class test {
    //     private st: string = 'a';
    //     @b()
    //     method(s: string) {
    //         console.log('ion', s, this.st);
    //     }
    //     c() {
    //     }
    // }
    // let g = new test();
    // g.method('lol');
    // g.method('lo2l');
});
//# sourceMappingURL=debug.js.map