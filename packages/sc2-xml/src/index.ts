export {
    XMLNodeKind,
    XMLNode,
    XMLDocument,
    XMLElement,
    XMLAttr,
    TokenType,
    ScannerState,
    Scanner,
    DiagnosticCategory,
    DiagnosticReport,
} from './types.js';

export {
    CharacterCodes,
    createScanner,
    buildLineMap,
} from './scanner.js';

export {
    ParserHooks,
    parse,
} from './parser.js';

export {
    findFirst,
    binarySearch,
} from './utils.js';
