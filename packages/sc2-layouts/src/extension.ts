import * as vs from 'vscode';
import { ServiceContext } from './service';
import { activateTagClosing } from './features/tagClosing';

let svcContext: ServiceContext;

export function activate(context: vs.ExtensionContext) {
    // async function tagRequestor(document: vs.TextDocument, position: vs.Position) {
    //     if (false) return '';
    // }
    // context.subscriptions.push(
    //     activateTagClosing(tagRequestor, { sc2layout: true}, 'sc2layout.autoClosingTags.enabled')
    // );

    vs.languages.setLanguageConfiguration('sc2layout', {
        indentationRules: {
            increaseIndentPattern: /<(?!\?|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
            decreaseIndentPattern: /^\s*(<\/[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/
        },
        // wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        onEnterRules: [
            {
                // beforeText: new RegExp(`<([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
                beforeText: /<([_:\w][_:\w-.\d]*)([^>/]*(?!\/>)(\/[^>]|>))+[^</]*$/i,
                afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
                action: { indentAction: vs.IndentAction.IndentOutdent }
            },
            {
                beforeText: new RegExp(`<(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
                action: { indentAction: vs.IndentAction.Indent }
            }
        ],
    });

    svcContext = new ServiceContext();
    svcContext.activate(context);
}
