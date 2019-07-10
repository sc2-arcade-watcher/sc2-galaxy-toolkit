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

    context.subscriptions.push(vs.languages.setLanguageConfiguration('sc2layout', {
        indentationRules: {
            increaseIndentPattern: /<(?!\?|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
            decreaseIndentPattern: /^\s*(<\/[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,

            /**
             * following rule would handle indentation correctly in scenarios like such, but do we really want that?
             *
             * ```xml
             * <Frame type="Frame" name="GameUI/WorldPanel" file="GameUI">
             * <Visible val="False"/></Frame>
             * ```
             */
            // decreaseIndentPattern: /^(\s*<([-_\.A-Za-z0-9]+)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^\/>]*\/>)*\s*(<\/[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
        },
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        onEnterRules: [
            {
                beforeText: /<([_:\w][_:\w-.\d]*)([^>/]*(?!\/>)(\/[^>]|>))+[^</]*$/i,
                afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>\s*$/i,
                action: { indentAction: vs.IndentAction.IndentOutdent }
            },
        ],
    }));

    svcContext = new ServiceContext();
    svcContext.activate(context);
}
