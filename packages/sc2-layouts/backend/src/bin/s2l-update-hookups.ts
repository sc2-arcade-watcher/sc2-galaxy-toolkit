import * as fs from 'fs-extra';

interface HookupEntry {
    type: string;
    name: string;
}

interface Hookup {
    fclass: string;
    children: HookupEntry[];
}

async function applyHookups(srcList: string, srcFrmType: string) {
    const hookups: Hookup[] = await fs.readJSON(srcList);
    let frmTypeXML = await fs.readFile(srcFrmType, 'utf8');

    function appendChunk(currentHookup: Hookup) {
        const frameName = currentHookup.fclass.substr(1);
        const rawXMLHookups: string[] = [];
        for (const entry of currentHookup.children) {
            rawXMLHookups.push(' '.repeat(8) + `<hookup path="${entry.name}" class="${entry.type}" required="true"/>`);
        }
        let offset = frmTypeXML.indexOf(`<frameType name="${frameName}"`);
        if (offset === -1) {
            console.error(`frameType element for "${frameName}" not found`);
            return;
        }
        offset = frmTypeXML.indexOf('>', offset) + 1;
        frmTypeXML = frmTypeXML.substr(0, offset) + '\n' + rawXMLHookups.join('\n') + frmTypeXML.substr(offset);
    }

    for (const currentHookup of hookups) {
        appendChunk(currentHookup)
    }

    process.stdout.write(frmTypeXML);
}

if (process.argv.length < 4) throw new Error('missing required args');
applyHookups(process.argv[2], process.argv[3]);
