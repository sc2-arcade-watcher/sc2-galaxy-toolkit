define("types", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CharacterCodes;
    (function (CharacterCodes) {
        CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
        CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 127] = "maxAsciiCharacter";
        CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
        CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
        CharacterCodes[CharacterCodes["lineSeparator"] = 8232] = "lineSeparator";
        CharacterCodes[CharacterCodes["paragraphSeparator"] = 8233] = "paragraphSeparator";
        CharacterCodes[CharacterCodes["nextLine"] = 133] = "nextLine";
        CharacterCodes[CharacterCodes["space"] = 32] = "space";
        CharacterCodes[CharacterCodes["nonBreakingSpace"] = 160] = "nonBreakingSpace";
        CharacterCodes[CharacterCodes["enQuad"] = 8192] = "enQuad";
        CharacterCodes[CharacterCodes["emQuad"] = 8193] = "emQuad";
        CharacterCodes[CharacterCodes["enSpace"] = 8194] = "enSpace";
        CharacterCodes[CharacterCodes["emSpace"] = 8195] = "emSpace";
        CharacterCodes[CharacterCodes["threePerEmSpace"] = 8196] = "threePerEmSpace";
        CharacterCodes[CharacterCodes["fourPerEmSpace"] = 8197] = "fourPerEmSpace";
        CharacterCodes[CharacterCodes["sixPerEmSpace"] = 8198] = "sixPerEmSpace";
        CharacterCodes[CharacterCodes["figureSpace"] = 8199] = "figureSpace";
        CharacterCodes[CharacterCodes["punctuationSpace"] = 8200] = "punctuationSpace";
        CharacterCodes[CharacterCodes["thinSpace"] = 8201] = "thinSpace";
        CharacterCodes[CharacterCodes["hairSpace"] = 8202] = "hairSpace";
        CharacterCodes[CharacterCodes["zeroWidthSpace"] = 8203] = "zeroWidthSpace";
        CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 8239] = "narrowNoBreakSpace";
        CharacterCodes[CharacterCodes["ideographicSpace"] = 12288] = "ideographicSpace";
        CharacterCodes[CharacterCodes["mathematicalSpace"] = 8287] = "mathematicalSpace";
        CharacterCodes[CharacterCodes["ogham"] = 5760] = "ogham";
        CharacterCodes[CharacterCodes["_"] = 95] = "_";
        CharacterCodes[CharacterCodes["$"] = 36] = "$";
        CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
        CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
        CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
        CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
        CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
        CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
        CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
        CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
        CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
        CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
        CharacterCodes[CharacterCodes["a"] = 97] = "a";
        CharacterCodes[CharacterCodes["b"] = 98] = "b";
        CharacterCodes[CharacterCodes["c"] = 99] = "c";
        CharacterCodes[CharacterCodes["d"] = 100] = "d";
        CharacterCodes[CharacterCodes["e"] = 101] = "e";
        CharacterCodes[CharacterCodes["f"] = 102] = "f";
        CharacterCodes[CharacterCodes["g"] = 103] = "g";
        CharacterCodes[CharacterCodes["h"] = 104] = "h";
        CharacterCodes[CharacterCodes["i"] = 105] = "i";
        CharacterCodes[CharacterCodes["j"] = 106] = "j";
        CharacterCodes[CharacterCodes["k"] = 107] = "k";
        CharacterCodes[CharacterCodes["l"] = 108] = "l";
        CharacterCodes[CharacterCodes["m"] = 109] = "m";
        CharacterCodes[CharacterCodes["n"] = 110] = "n";
        CharacterCodes[CharacterCodes["o"] = 111] = "o";
        CharacterCodes[CharacterCodes["p"] = 112] = "p";
        CharacterCodes[CharacterCodes["q"] = 113] = "q";
        CharacterCodes[CharacterCodes["r"] = 114] = "r";
        CharacterCodes[CharacterCodes["s"] = 115] = "s";
        CharacterCodes[CharacterCodes["t"] = 116] = "t";
        CharacterCodes[CharacterCodes["u"] = 117] = "u";
        CharacterCodes[CharacterCodes["v"] = 118] = "v";
        CharacterCodes[CharacterCodes["w"] = 119] = "w";
        CharacterCodes[CharacterCodes["x"] = 120] = "x";
        CharacterCodes[CharacterCodes["y"] = 121] = "y";
        CharacterCodes[CharacterCodes["z"] = 122] = "z";
        CharacterCodes[CharacterCodes["A"] = 65] = "A";
        CharacterCodes[CharacterCodes["B"] = 66] = "B";
        CharacterCodes[CharacterCodes["C"] = 67] = "C";
        CharacterCodes[CharacterCodes["D"] = 68] = "D";
        CharacterCodes[CharacterCodes["E"] = 69] = "E";
        CharacterCodes[CharacterCodes["F"] = 70] = "F";
        CharacterCodes[CharacterCodes["G"] = 71] = "G";
        CharacterCodes[CharacterCodes["H"] = 72] = "H";
        CharacterCodes[CharacterCodes["I"] = 73] = "I";
        CharacterCodes[CharacterCodes["J"] = 74] = "J";
        CharacterCodes[CharacterCodes["K"] = 75] = "K";
        CharacterCodes[CharacterCodes["L"] = 76] = "L";
        CharacterCodes[CharacterCodes["M"] = 77] = "M";
        CharacterCodes[CharacterCodes["N"] = 78] = "N";
        CharacterCodes[CharacterCodes["O"] = 79] = "O";
        CharacterCodes[CharacterCodes["P"] = 80] = "P";
        CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
        CharacterCodes[CharacterCodes["R"] = 82] = "R";
        CharacterCodes[CharacterCodes["S"] = 83] = "S";
        CharacterCodes[CharacterCodes["T"] = 84] = "T";
        CharacterCodes[CharacterCodes["U"] = 85] = "U";
        CharacterCodes[CharacterCodes["V"] = 86] = "V";
        CharacterCodes[CharacterCodes["W"] = 87] = "W";
        CharacterCodes[CharacterCodes["X"] = 88] = "X";
        CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
        CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
        CharacterCodes[CharacterCodes["ampersand"] = 38] = "ampersand";
        CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
        CharacterCodes[CharacterCodes["at"] = 64] = "at";
        CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
        CharacterCodes[CharacterCodes["backtick"] = 96] = "backtick";
        CharacterCodes[CharacterCodes["bar"] = 124] = "bar";
        CharacterCodes[CharacterCodes["caret"] = 94] = "caret";
        CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
        CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
        CharacterCodes[CharacterCodes["closeParen"] = 41] = "closeParen";
        CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
        CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
        CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
        CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
        CharacterCodes[CharacterCodes["equals"] = 61] = "equals";
        CharacterCodes[CharacterCodes["exclamation"] = 33] = "exclamation";
        CharacterCodes[CharacterCodes["greaterThan"] = 62] = "greaterThan";
        CharacterCodes[CharacterCodes["hash"] = 35] = "hash";
        CharacterCodes[CharacterCodes["lessThan"] = 60] = "lessThan";
        CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
        CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
        CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
        CharacterCodes[CharacterCodes["openParen"] = 40] = "openParen";
        CharacterCodes[CharacterCodes["percent"] = 37] = "percent";
        CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
        CharacterCodes[CharacterCodes["question"] = 63] = "question";
        CharacterCodes[CharacterCodes["semicolon"] = 59] = "semicolon";
        CharacterCodes[CharacterCodes["singleQuote"] = 39] = "singleQuote";
        CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
        CharacterCodes[CharacterCodes["tilde"] = 126] = "tilde";
        CharacterCodes[CharacterCodes["backspace"] = 8] = "backspace";
        CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
        CharacterCodes[CharacterCodes["byteOrderMark"] = 65279] = "byteOrderMark";
        CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
        CharacterCodes[CharacterCodes["verticalTab"] = 11] = "verticalTab";
    })(CharacterCodes = exports.CharacterCodes || (exports.CharacterCodes = {}));
    var SyntaxKind;
    (function (SyntaxKind) {
        SyntaxKind[SyntaxKind["Unknown"] = 0] = "Unknown";
        SyntaxKind[SyntaxKind["NumericLiteral"] = 1] = "NumericLiteral";
        SyntaxKind[SyntaxKind["StringLiteral"] = 2] = "StringLiteral";
        SyntaxKind[SyntaxKind["OpenBraceToken"] = 3] = "OpenBraceToken";
        SyntaxKind[SyntaxKind["CloseBraceToken"] = 4] = "CloseBraceToken";
        SyntaxKind[SyntaxKind["OpenParenToken"] = 5] = "OpenParenToken";
        SyntaxKind[SyntaxKind["CloseParenToken"] = 6] = "CloseParenToken";
        SyntaxKind[SyntaxKind["OpenBracketToken"] = 7] = "OpenBracketToken";
        SyntaxKind[SyntaxKind["CloseBracketToken"] = 8] = "CloseBracketToken";
        SyntaxKind[SyntaxKind["DotToken"] = 9] = "DotToken";
        SyntaxKind[SyntaxKind["SemicolonToken"] = 10] = "SemicolonToken";
        SyntaxKind[SyntaxKind["CommaToken"] = 11] = "CommaToken";
        SyntaxKind[SyntaxKind["LessThanToken"] = 12] = "LessThanToken";
        SyntaxKind[SyntaxKind["GreaterThanToken"] = 13] = "GreaterThanToken";
        SyntaxKind[SyntaxKind["LessThanEqualsToken"] = 14] = "LessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanEqualsToken"] = 15] = "GreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["EqualsEqualsToken"] = 16] = "EqualsEqualsToken";
        SyntaxKind[SyntaxKind["ExclamationEqualsToken"] = 17] = "ExclamationEqualsToken";
        SyntaxKind[SyntaxKind["EqualsGreaterThanToken"] = 18] = "EqualsGreaterThanToken";
        SyntaxKind[SyntaxKind["PlusToken"] = 19] = "PlusToken";
        SyntaxKind[SyntaxKind["MinusToken"] = 20] = "MinusToken";
        SyntaxKind[SyntaxKind["AsteriskToken"] = 21] = "AsteriskToken";
        SyntaxKind[SyntaxKind["SlashToken"] = 22] = "SlashToken";
        SyntaxKind[SyntaxKind["PercentToken"] = 23] = "PercentToken";
        SyntaxKind[SyntaxKind["PlusPlusToken"] = 24] = "PlusPlusToken";
        SyntaxKind[SyntaxKind["MinusMinusToken"] = 25] = "MinusMinusToken";
        SyntaxKind[SyntaxKind["LessThanLessThanToken"] = 26] = "LessThanLessThanToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanToken"] = 27] = "GreaterThanGreaterThanToken";
        SyntaxKind[SyntaxKind["AmpersandToken"] = 28] = "AmpersandToken";
        SyntaxKind[SyntaxKind["BarToken"] = 29] = "BarToken";
        SyntaxKind[SyntaxKind["CaretToken"] = 30] = "CaretToken";
        SyntaxKind[SyntaxKind["ExclamationToken"] = 31] = "ExclamationToken";
        SyntaxKind[SyntaxKind["TildeToken"] = 32] = "TildeToken";
        SyntaxKind[SyntaxKind["AmpersandAmpersandToken"] = 33] = "AmpersandAmpersandToken";
        SyntaxKind[SyntaxKind["BarBarToken"] = 34] = "BarBarToken";
        SyntaxKind[SyntaxKind["QuestionToken"] = 35] = "QuestionToken";
        SyntaxKind[SyntaxKind["ColonToken"] = 36] = "ColonToken";
        SyntaxKind[SyntaxKind["AtToken"] = 37] = "AtToken";
        SyntaxKind[SyntaxKind["EqualsToken"] = 38] = "EqualsToken";
        SyntaxKind[SyntaxKind["PlusEqualsToken"] = 39] = "PlusEqualsToken";
        SyntaxKind[SyntaxKind["MinusEqualsToken"] = 40] = "MinusEqualsToken";
        SyntaxKind[SyntaxKind["AsteriskEqualsToken"] = 41] = "AsteriskEqualsToken";
        SyntaxKind[SyntaxKind["SlashEqualsToken"] = 42] = "SlashEqualsToken";
        SyntaxKind[SyntaxKind["PercentEqualsToken"] = 43] = "PercentEqualsToken";
        SyntaxKind[SyntaxKind["LessThanLessThanEqualsToken"] = 44] = "LessThanLessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanEqualsToken"] = 45] = "GreaterThanGreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["AmpersandEqualsToken"] = 46] = "AmpersandEqualsToken";
        SyntaxKind[SyntaxKind["BarEqualsToken"] = 47] = "BarEqualsToken";
        SyntaxKind[SyntaxKind["CaretEqualsToken"] = 48] = "CaretEqualsToken";
        SyntaxKind[SyntaxKind["IncludeKeyword"] = 49] = "IncludeKeyword";
        SyntaxKind[SyntaxKind["StructKeyword"] = 50] = "StructKeyword";
        SyntaxKind[SyntaxKind["StaticKeyword"] = 51] = "StaticKeyword";
        SyntaxKind[SyntaxKind["ConstKeyword"] = 52] = "ConstKeyword";
        SyntaxKind[SyntaxKind["NativeKeyword"] = 53] = "NativeKeyword";
        SyntaxKind[SyntaxKind["BreakKeyword"] = 54] = "BreakKeyword";
        SyntaxKind[SyntaxKind["ContinueKeyword"] = 55] = "ContinueKeyword";
        SyntaxKind[SyntaxKind["ReturnKeyword"] = 56] = "ReturnKeyword";
        SyntaxKind[SyntaxKind["DoKeyword"] = 57] = "DoKeyword";
        SyntaxKind[SyntaxKind["ForKeyword"] = 58] = "ForKeyword";
        SyntaxKind[SyntaxKind["WhileKeyword"] = 59] = "WhileKeyword";
        SyntaxKind[SyntaxKind["IfKeyword"] = 60] = "IfKeyword";
        SyntaxKind[SyntaxKind["ElseKeyword"] = 61] = "ElseKeyword";
        SyntaxKind[SyntaxKind["TrueKeyword"] = 62] = "TrueKeyword";
        SyntaxKind[SyntaxKind["FalseKeyword"] = 63] = "FalseKeyword";
        SyntaxKind[SyntaxKind["NullKeyword"] = 64] = "NullKeyword";
        SyntaxKind[SyntaxKind["TypedefKeyword"] = 65] = "TypedefKeyword";
        SyntaxKind[SyntaxKind["AbilcmdKeyword"] = 66] = "AbilcmdKeyword";
        SyntaxKind[SyntaxKind["ActorKeyword"] = 67] = "ActorKeyword";
        SyntaxKind[SyntaxKind["ActorscopeKeyword"] = 68] = "ActorscopeKeyword";
        SyntaxKind[SyntaxKind["AifilterKeyword"] = 69] = "AifilterKeyword";
        SyntaxKind[SyntaxKind["AnimfilterKeyword"] = 70] = "AnimfilterKeyword";
        SyntaxKind[SyntaxKind["BankKeyword"] = 71] = "BankKeyword";
        SyntaxKind[SyntaxKind["BoolKeyword"] = 72] = "BoolKeyword";
        SyntaxKind[SyntaxKind["ByteKeyword"] = 73] = "ByteKeyword";
        SyntaxKind[SyntaxKind["CamerainfoKeyword"] = 74] = "CamerainfoKeyword";
        SyntaxKind[SyntaxKind["CharKeyword"] = 75] = "CharKeyword";
        SyntaxKind[SyntaxKind["ColorKeyword"] = 76] = "ColorKeyword";
        SyntaxKind[SyntaxKind["DoodadKeyword"] = 77] = "DoodadKeyword";
        SyntaxKind[SyntaxKind["FixedKeyword"] = 78] = "FixedKeyword";
        SyntaxKind[SyntaxKind["HandleKeyword"] = 79] = "HandleKeyword";
        SyntaxKind[SyntaxKind["GenerichandleKeyword"] = 80] = "GenerichandleKeyword";
        SyntaxKind[SyntaxKind["EffecthistoryKeyword"] = 81] = "EffecthistoryKeyword";
        SyntaxKind[SyntaxKind["IntKeyword"] = 82] = "IntKeyword";
        SyntaxKind[SyntaxKind["MarkerKeyword"] = 83] = "MarkerKeyword";
        SyntaxKind[SyntaxKind["OrderKeyword"] = 84] = "OrderKeyword";
        SyntaxKind[SyntaxKind["PlayergroupKeyword"] = 85] = "PlayergroupKeyword";
        SyntaxKind[SyntaxKind["PointKeyword"] = 86] = "PointKeyword";
        SyntaxKind[SyntaxKind["RegionKeyword"] = 87] = "RegionKeyword";
        SyntaxKind[SyntaxKind["RevealerKeyword"] = 88] = "RevealerKeyword";
        SyntaxKind[SyntaxKind["SoundKeyword"] = 89] = "SoundKeyword";
        SyntaxKind[SyntaxKind["SoundlinkKeyword"] = 90] = "SoundlinkKeyword";
        SyntaxKind[SyntaxKind["StringKeyword"] = 91] = "StringKeyword";
        SyntaxKind[SyntaxKind["TextKeyword"] = 92] = "TextKeyword";
        SyntaxKind[SyntaxKind["TimerKeyword"] = 93] = "TimerKeyword";
        SyntaxKind[SyntaxKind["TransmissionsourceKeyword"] = 94] = "TransmissionsourceKeyword";
        SyntaxKind[SyntaxKind["TriggerKeyword"] = 95] = "TriggerKeyword";
        SyntaxKind[SyntaxKind["UnitKeyword"] = 96] = "UnitKeyword";
        SyntaxKind[SyntaxKind["UnitfilterKeyword"] = 97] = "UnitfilterKeyword";
        SyntaxKind[SyntaxKind["UnitgroupKeyword"] = 98] = "UnitgroupKeyword";
        SyntaxKind[SyntaxKind["UnitrefKeyword"] = 99] = "UnitrefKeyword";
        SyntaxKind[SyntaxKind["VoidKeyword"] = 100] = "VoidKeyword";
        SyntaxKind[SyntaxKind["WaveKeyword"] = 101] = "WaveKeyword";
        SyntaxKind[SyntaxKind["WaveinfoKeyword"] = 102] = "WaveinfoKeyword";
        SyntaxKind[SyntaxKind["WavetargetKeyword"] = 103] = "WavetargetKeyword";
        SyntaxKind[SyntaxKind["ArrayrefKeyword"] = 104] = "ArrayrefKeyword";
        SyntaxKind[SyntaxKind["StructrefKeyword"] = 105] = "StructrefKeyword";
        SyntaxKind[SyntaxKind["FuncrefKeyword"] = 106] = "FuncrefKeyword";
        SyntaxKind[SyntaxKind["EndOfFileToken"] = 107] = "EndOfFileToken";
        SyntaxKind[SyntaxKind["Identifier"] = 108] = "Identifier";
        SyntaxKind[SyntaxKind["TypeReference"] = 109] = "TypeReference";
        SyntaxKind[SyntaxKind["KeywordType"] = 110] = "KeywordType";
        SyntaxKind[SyntaxKind["SourceFile"] = 111] = "SourceFile";
        SyntaxKind[SyntaxKind["Block"] = 112] = "Block";
        SyntaxKind[SyntaxKind["IncludeStatement"] = 113] = "IncludeStatement";
        SyntaxKind[SyntaxKind["StructDeclaration"] = 114] = "StructDeclaration";
        SyntaxKind[SyntaxKind["VariableDeclaration"] = 115] = "VariableDeclaration";
        SyntaxKind[SyntaxKind["FunctionDeclaration"] = 116] = "FunctionDeclaration";
        SyntaxKind[SyntaxKind["ParameterDeclaration"] = 117] = "ParameterDeclaration";
        SyntaxKind[SyntaxKind["PropertyDeclaration"] = 118] = "PropertyDeclaration";
    })(SyntaxKind = exports.SyntaxKind || (exports.SyntaxKind = {}));
    var DiagnosticCategory;
    (function (DiagnosticCategory) {
        DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
        DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
        DiagnosticCategory[DiagnosticCategory["Message"] = 2] = "Message";
    })(DiagnosticCategory = exports.DiagnosticCategory || (exports.DiagnosticCategory = {}));
});
define("scanner", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const textToTokenTable = new Map([
        ["include", 49],
        ["struct", 50],
        ["static", 51],
        ["const", 52],
        ["native", 53],
        ["break", 54],
        ["continue", 55],
        ["return", 56],
        ["do", 57],
        ["for", 58],
        ["while", 59],
        ["if", 60],
        ["else", 61],
        ["true", 62],
        ["false", 63],
        ["null", 64],
        ["typedef", 65],
        ["abilcmd", 66],
        ["actor", 67],
        ["actorscope", 68],
        ["aifilter", 69],
        ["animfilter", 70],
        ["bank", 71],
        ["bool", 72],
        ["byte", 73],
        ["camerainfo", 74],
        ["char", 75],
        ["color", 76],
        ["doodad", 77],
        ["fixed", 78],
        ["handle", 79],
        ["generichandle", 80],
        ["effecthistory", 81],
        ["int", 82],
        ["marker", 83],
        ["order", 84],
        ["playergroup", 85],
        ["point", 86],
        ["region", 87],
        ["revealer", 88],
        ["sound", 89],
        ["soundlink", 90],
        ["string", 91],
        ["text", 92],
        ["timer", 93],
        ["transmissionsource", 94],
        ["trigger", 95],
        ["unit", 96],
        ["unitfilter", 97],
        ["unitgroup", 98],
        ["unitref", 99],
        ["void", 100],
        ["wave", 101],
        ["waveinfo", 102],
        ["wavetarget", 103],
        ["arrayref", 104],
        ["structref", 105],
        ["funcref", 106],
        ["{", 3],
        ["}", 4],
        ["(", 5],
        [")", 6],
        ["[", 7],
        ["]", 8],
        [".", 9],
        [";", 10],
        [",", 11],
        ["<", 12],
        [">", 13],
        ["<=", 14],
        [">=", 15],
        ["==", 16],
        ["!=", 17],
        ["=>", 18],
        ["+", 19],
        ["-", 20],
        ["*", 21],
        ["/", 22],
        ["%", 23],
        ["++", 24],
        ["--", 25],
        ["<<", 26],
        [">>", 27],
        ["&", 28],
        ["|", 29],
        ["^", 30],
        ["!", 31],
        ["~", 32],
        ["&&", 33],
        ["||", 34],
        ["?", 35],
        [":", 36],
        ["=", 38],
        ["+=", 39],
        ["-=", 40],
        ["*=", 41],
        ["/=", 42],
        ["%=", 43],
        ["<<=", 44],
        [">>=", 45],
        ["&=", 46],
        ["|=", 47],
        ["^=", 48],
    ]);
    function makeReverseMap(source) {
        const result = [];
        source.forEach((value, name) => {
            result[value] = name;
        });
        return result;
    }
    const tokenStrings = makeReverseMap(textToTokenTable);
    function stringToToken(s) {
        return textToTokenTable.get(s);
    }
    exports.stringToToken = stringToToken;
    function tokenToString(t) {
        return tokenStrings[t];
    }
    exports.tokenToString = tokenToString;
    function isIdentifierStart(ch) {
        return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 ||
            ch === 95 ||
            ch > 127;
    }
    exports.isIdentifierStart = isIdentifierStart;
    function isIdentifierPart(ch) {
        return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 ||
            ch >= 48 && ch <= 57 || ch === 95 ||
            ch > 127;
    }
    exports.isIdentifierPart = isIdentifierPart;
    function isLineBreak(ch) {
        return ch === 10 ||
            ch === 13 ||
            ch === 8232 ||
            ch === 8233;
    }
    exports.isLineBreak = isLineBreak;
    function isDigit(ch) {
        return ch >= 48 && ch <= 57;
    }
    exports.isDigit = isDigit;
    function isOctalDigit(ch) {
        return ch >= 48 && ch <= 55;
    }
    exports.isOctalDigit = isOctalDigit;
    class Scanner {
        error(msg) {
            throw new Error(msg);
        }
        speculationHelper(callback, isLookahead) {
            const savePos = this.pos;
            const saveStartPos = this.startPos;
            const saveTokenPos = this.tokenPos;
            const saveToken = this.token;
            const saveTokenValue = this.tokenValue;
            const result = callback();
            if (!result || isLookahead) {
                this.pos = savePos;
                this.startPos = saveStartPos;
                this.tokenPos = saveTokenPos;
                this.token = saveToken;
                this.tokenValue = saveTokenValue;
            }
            return result;
        }
        lookAhead(callback) {
            return this.speculationHelper(callback, true);
        }
        tryScan(callback) {
            return this.speculationHelper(callback, false);
        }
        scanHexDigits(minCount, scanAsManyAsPossible) {
            let digits = 0;
            let value = 0;
            while (digits < minCount || scanAsManyAsPossible) {
                const ch = this.text.charCodeAt(this.pos);
                if (ch >= 48 && ch <= 57) {
                    value = value * 16 + ch - 48;
                }
                else if (ch >= 65 && ch <= 70) {
                    value = value * 16 + ch - 65 + 10;
                }
                else if (ch >= 97 && ch <= 102) {
                    value = value * 16 + ch - 97 + 10;
                }
                else {
                    break;
                }
                this.pos++;
                digits++;
            }
            if (digits < minCount) {
                value = -1;
            }
            return value;
        }
        scanEscapeSequence() {
            this.pos++;
            if (this.pos >= this.end) {
                this.error("Diagnostics.Unexpected_end_of_text");
                return "";
            }
            const ch = this.text.charCodeAt(this.pos);
            this.pos++;
            switch (ch) {
                case 48:
                    return "\0";
                case 98:
                    return "\b";
                case 116:
                    return "\t";
                case 110:
                    return "\n";
                case 118:
                    return "\v";
                case 102:
                    return "\f";
                case 114:
                    return "\r";
                case 39:
                    return "\'";
                case 34:
                    return "\"";
                case 120:
                    const escapedValue = this.scanHexDigits(2, false);
                    if (escapedValue >= 0) {
                        return String.fromCharCode(escapedValue);
                    }
                    else {
                        this.error("Diagnostics.Hexadecimal_digit_expected");
                        return "";
                    }
                case 13:
                    if (this.pos < this.end && this.text.charCodeAt(this.pos) === 10) {
                        this.pos++;
                    }
                case 10:
                case 8232:
                case 8233:
                    return "";
                default:
                    return String.fromCharCode(ch);
            }
        }
        scanString(allowEscapes = true) {
            const quote = this.text.charCodeAt(this.pos);
            this.pos++;
            let result = "";
            let start = this.pos;
            while (true) {
                if (this.pos >= this.end) {
                    result += this.text.substring(start, this.pos);
                    this.error("Diagnostics.Unterminated_string_literal");
                    break;
                }
                const ch = this.text.charCodeAt(this.pos);
                if (ch === quote) {
                    result += this.text.substring(start, this.pos);
                    this.pos++;
                    break;
                }
                if (ch === 92 && allowEscapes) {
                    result += this.text.substring(start, this.pos);
                    result += this.scanEscapeSequence();
                    start = this.pos;
                    continue;
                }
                if (isLineBreak(ch)) {
                    result += this.text.substring(start, this.pos);
                    this.error("Diagnostics.Unterminated_string_literal");
                    break;
                }
                this.pos++;
            }
            return result;
        }
        scanNumber() {
            const start = this.pos;
            while (isDigit(this.text.charCodeAt(this.pos)))
                this.pos++;
            if (this.text.charCodeAt(this.pos) === 46) {
                this.pos++;
                while (isDigit(this.text.charCodeAt(this.pos)))
                    this.pos++;
            }
            let end = this.pos;
            if (this.text.charCodeAt(this.pos) === 69 || this.text.charCodeAt(this.pos) === 101) {
                this.pos++;
                if (this.text.charCodeAt(this.pos) === 43 || this.text.charCodeAt(this.pos) === 45)
                    this.pos++;
                if (isDigit(this.text.charCodeAt(this.pos))) {
                    this.pos++;
                    while (isDigit(this.text.charCodeAt(this.pos)))
                        this.pos++;
                    end = this.pos;
                }
                else {
                    this.error("Diagnostics.Digit_expected");
                }
            }
            return "" + +(this.text.substring(start, end));
        }
        scanBinaryOrOctalDigits(base) {
            console.assert(base === 2 || base === 8, "Expected either base 2 or base 8");
            let value = 0;
            let numberOfDigits = 0;
            while (true) {
                const ch = this.text.charCodeAt(this.pos);
                const valueOfCh = ch - 48;
                if (!isDigit(ch) || valueOfCh >= base) {
                    break;
                }
                value = value * base + valueOfCh;
                this.pos++;
                numberOfDigits++;
            }
            if (numberOfDigits === 0) {
                return -1;
            }
            return value;
        }
        scanOctalDigits() {
            const start = this.pos;
            while (isOctalDigit(this.text.charCodeAt(this.pos))) {
                this.pos++;
            }
            return +(this.text.substring(start, this.pos));
        }
        getIdentifierToken() {
            let token;
            const len = this.tokenValue.length;
            const ch = this.tokenValue.charCodeAt(0);
            if (ch >= 97 && ch <= 122) {
                token = stringToToken(this.tokenValue);
                if (token !== undefined) {
                    return token;
                }
            }
            return 108;
        }
        setText(text) {
            this.text = text;
            this.pos = 0;
            this.end = this.text.length;
        }
        scan() {
            this.startPos = this.pos;
            while (true) {
                this.tokenPos = this.pos;
                if (this.pos >= this.end) {
                    return 107;
                }
                let ch = this.text.charCodeAt(this.pos);
                switch (ch) {
                    case 10:
                    case 9:
                    case 11:
                    case 12:
                    case 32:
                        ++this.pos;
                        break;
                    case 59:
                        ++this.pos;
                        return this.token = 10;
                    case 40:
                        this.pos++;
                        return this.token = 5;
                    case 41:
                        this.pos++;
                        return this.token = 6;
                    case 34:
                    case 39:
                        this.tokenValue = this.scanString();
                        return this.token = 2;
                    case 37:
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 43;
                        }
                        this.pos++;
                        return this.token = 23;
                    case 38:
                        if (this.text.charCodeAt(this.pos + 1) === 38) {
                            return this.pos += 2, this.token = 33;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 46;
                        }
                        this.pos++;
                        return this.token = 28;
                    case 40:
                        this.pos++;
                        return this.token = 5;
                    case 41:
                        this.pos++;
                        return this.token = 6;
                    case 42:
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 41;
                        }
                        this.pos++;
                        return this.token = 21;
                    case 43:
                        if (this.text.charCodeAt(this.pos + 1) === 43) {
                            return this.pos += 2, this.token = 24;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 39;
                        }
                        this.pos++;
                        return this.token = 19;
                    case 44:
                        this.pos++;
                        return this.token = 11;
                    case 45:
                        if (this.text.charCodeAt(this.pos + 1) === 45) {
                            return this.pos += 2, this.token = 25;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 40;
                        }
                        this.pos++;
                        return this.token = 20;
                    case 46:
                        if (isDigit(this.text.charCodeAt(this.pos + 1))) {
                            this.tokenValue = this.scanNumber();
                            return this.token = 1;
                        }
                        this.pos++;
                        return this.token = 9;
                    case 47:
                        if (this.text.charCodeAt(this.pos + 1) === 47) {
                            this.pos += 2;
                            while (this.pos < this.end) {
                                if (isLineBreak(this.text.charCodeAt(this.pos))) {
                                    break;
                                }
                                this.pos++;
                            }
                            continue;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 42;
                        }
                        this.pos++;
                        return this.token = 22;
                    case 48:
                        if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 88 || this.text.charCodeAt(this.pos + 1) === 120)) {
                            this.pos += 2;
                            let value = this.scanHexDigits(1, true);
                            if (value < 0) {
                                this.error("Diagnostics.Hexadecimal_digit_expected");
                                value = 0;
                            }
                            this.tokenValue = "" + value;
                            return this.token = 1;
                        }
                        else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 66 || this.text.charCodeAt(this.pos + 1) === 98)) {
                            this.pos += 2;
                            let value = this.scanBinaryOrOctalDigits(2);
                            if (value < 0) {
                                this.error("Diagnostics.Binary_digit_expected");
                                value = 0;
                            }
                            this.tokenValue = "" + value;
                            return this.token = 1;
                        }
                        else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 79 || this.text.charCodeAt(this.pos + 1) === 111)) {
                            this.pos += 2;
                            let value = this.scanBinaryOrOctalDigits(8);
                            if (value < 0) {
                                this.error("Diagnostics.Octal_digit_expected");
                                value = 0;
                            }
                            this.tokenValue = "" + value;
                            return this.token = 1;
                        }
                        if (this.pos + 1 < this.end && isOctalDigit(this.text.charCodeAt(this.pos + 1))) {
                            this.tokenValue = "" + this.scanOctalDigits();
                            return this.token = 1;
                        }
                    case 49:
                    case 50:
                    case 51:
                    case 52:
                    case 53:
                    case 54:
                    case 55:
                    case 56:
                    case 57:
                        this.tokenValue = this.scanNumber();
                        return this.token = 1;
                    case 60:
                        if (this.text.charCodeAt(this.pos + 1) === 60) {
                            if (this.text.charCodeAt(this.pos + 2) === 61) {
                                return this.pos += 3, this.token = 44;
                            }
                            return this.pos += 2, this.token = 26;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 14;
                        }
                        this.pos++;
                        return this.token = 12;
                    case 61:
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 16;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 62) {
                            return this.pos += 2, this.token = 18;
                        }
                        this.pos++;
                        return this.token = 38;
                    case 62:
                        this.pos++;
                        return this.token = 13;
                    case 91:
                        this.pos++;
                        return this.token = 7;
                    case 93:
                        this.pos++;
                        return this.token = 8;
                    case 94:
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 48;
                        }
                        this.pos++;
                        return this.token = 30;
                    case 123:
                        this.pos++;
                        return this.token = 3;
                    case 124:
                        if (this.text.charCodeAt(this.pos + 1) === 124) {
                            return this.pos += 2, this.token = 34;
                        }
                        if (this.text.charCodeAt(this.pos + 1) === 61) {
                            return this.pos += 2, this.token = 47;
                        }
                        this.pos++;
                        return this.token = 29;
                    case 125:
                        this.pos++;
                        return this.token = 4;
                    case 126:
                        this.pos++;
                        return this.token = 32;
                    default:
                        if (isIdentifierStart(ch)) {
                            this.pos++;
                            while (this.pos < this.end && isIdentifierPart(ch = this.text.charCodeAt(this.pos)))
                                this.pos++;
                            this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                            return this.token = this.getIdentifierToken();
                        }
                        else if (isLineBreak(ch)) {
                            this.pos++;
                            continue;
                        }
                        this.error("Diagnostics.Invalid_character");
                        this.pos++;
                        return this.token = 0;
                }
            }
        }
        getStartPos() {
            return this.startPos;
        }
        getTokenPos() {
            return this.tokenPos;
        }
        getTextPos() {
            return this.end;
        }
        getTokenValue() {
            return this.tokenValue;
        }
    }
    exports.Scanner = Scanner;
});
define("utils", ["require", "exports", "types"], function (require, exports, Types) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function formatStringFromArgs(text, args, baseIndex) {
        baseIndex = baseIndex || 0;
        return text.replace(/{(\d+)}/g, (_match, index) => args[+index + baseIndex]);
    }
    exports.formatStringFromArgs = formatStringFromArgs;
    function createFileDiagnostic(file, start, length, message) {
        const end = start + length;
        let text = message.message;
        if (arguments.length > 4) {
            text = formatStringFromArgs(text, arguments, 4);
        }
        return {
            file,
            start,
            length,
            messageText: text,
            category: message.category,
            code: message.code,
        };
    }
    exports.createFileDiagnostic = createFileDiagnostic;
    function isModifierKind(token) {
        switch (token) {
            case 52:
            case 51:
            case 53:
                return true;
        }
        return false;
    }
    exports.isModifierKind = isModifierKind;
    function isKeywordTypeKind(token) {
        switch (token) {
            case 66:
            case 67:
            case 68:
            case 69:
            case 70:
            case 71:
            case 72:
            case 73:
            case 74:
            case 75:
            case 76:
            case 77:
            case 78:
            case 79:
            case 80:
            case 81:
            case 82:
            case 83:
            case 84:
            case 85:
            case 86:
            case 87:
            case 88:
            case 89:
            case 90:
            case 91:
            case 92:
            case 93:
            case 94:
            case 95:
            case 96:
            case 97:
            case 98:
            case 99:
            case 100:
            case 101:
            case 102:
            case 103:
            case 104:
            case 105:
            case 106:
                return true;
        }
        return false;
    }
    exports.isKeywordTypeKind = isKeywordTypeKind;
    function isNodeOrArray(a) {
        return a !== undefined && a.kind !== undefined;
    }
    function getKindName(k) {
        if (typeof k === "string") {
            return k;
        }
        return Types.SyntaxKind[k];
    }
    exports.getKindName = getKindName;
    function sourceFileToJSON(file) {
        return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");
        function serializeNode(n) {
            const o = { kind: getKindName(n.kind) };
            for (let propertyName in n) {
                switch (propertyName) {
                    case "parent":
                    case "symbol":
                    case "locals":
                    case "localSymbol":
                    case "kind":
                    case "semanticDiagnostics":
                    case "id":
                    case "nodeCount":
                    case "symbolCount":
                    case "identifierCount":
                    case "scriptSnapshot":
                        break;
                    case "originalKeywordKind":
                        o[propertyName] = getKindName(n[propertyName]);
                        break;
                    case "flags":
                        break;
                    case "text":
                        if (n.kind !== 111) {
                            o[propertyName] = n[propertyName];
                        }
                        break;
                    default:
                        o[propertyName] = n[propertyName];
                }
            }
            return o;
        }
    }
    exports.sourceFileToJSON = sourceFileToJSON;
});
define("parser", ["require", "exports", "types", "scanner", "utils"], function (require, exports, Types, scanner_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ParsingContext;
    (function (ParsingContext) {
        ParsingContext[ParsingContext["SourceElements"] = 0] = "SourceElements";
        ParsingContext[ParsingContext["BlockStatements"] = 1] = "BlockStatements";
        ParsingContext[ParsingContext["StructMembers"] = 2] = "StructMembers";
        ParsingContext[ParsingContext["TypeParameters"] = 3] = "TypeParameters";
    })(ParsingContext || (ParsingContext = {}));
    class Parser {
        constructor() {
            this.parsingContext = 0;
            this.parseDiagnostics = [];
            this.scanner = new scanner_1.Scanner();
        }
        token() {
            return this.currentToken;
        }
        nextToken() {
            return this.currentToken = this.scanner.scan();
        }
        parseErrorAtCurrentToken(message, arg0) {
            const start = this.scanner.getTokenPos();
            const length = this.scanner.getTextPos() - start;
            this.parseErrorAtPosition(start, length, message, arg0);
        }
        parseErrorAtPosition(start, length, message, arg0) {
            const diag = utils_1.createFileDiagnostic(this.sourceFile, start, length, {
                code: 1001,
                category: Types.DiagnosticCategory.Error,
                message: message,
            }, arg0);
            this.parseDiagnostics.push(diag);
            throw new Error(`${diag.file.fileName} [${diag.start}]: ${diag.messageText}`);
        }
        speculationHelper(callback, isLookAhead) {
            const saveToken = this.currentToken;
            const result = isLookAhead
                ? this.scanner.lookAhead(callback)
                : this.scanner.tryScan(callback);
            if (!result || isLookAhead) {
                this.currentToken = saveToken;
            }
            return result;
        }
        lookAhead(callback) {
            return this.speculationHelper(callback, true);
        }
        parseExpected(kind, diagnosticMessage, shouldAdvance = true) {
            if (this.token() === kind) {
                if (shouldAdvance) {
                    this.nextToken();
                }
                return true;
            }
            if (diagnosticMessage == null) {
                diagnosticMessage = "Expected " + utils_1.getKindName(kind) + ", found " + utils_1.getKindName(this.currentToken);
            }
            this.parseErrorAtCurrentToken(diagnosticMessage);
            return false;
        }
        isVariableDeclaration() {
            if (this.token() === 52) {
                this.nextToken();
            }
            if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 108) {
                return false;
            }
            if (this.nextToken() !== 108) {
                return false;
            }
            this.nextToken();
            if (this.token() !== 38 && this.token() !== 10) {
                return false;
            }
            return true;
        }
        isFunctionDeclaration() {
            while (this.token() === 53 || this.token() === 51) {
                this.nextToken();
            }
            if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 108) {
                return false;
            }
            if (this.nextToken() !== 108) {
                return false;
            }
            this.nextToken();
            if (this.token() !== 5) {
                return false;
            }
            return true;
        }
        isStartOfExpression() {
            return false;
        }
        isStartOfStatement() {
            switch (this.token()) {
                case 10:
                case 3:
                case 50:
                case 60:
                case 57:
                case 59:
                case 58:
                case 55:
                case 54:
                case 56:
                case 49:
                    return true;
                case 52:
                    return true;
                case 51:
                case 53:
                    return true;
                default:
                    return this.isStartOfExpression();
            }
        }
        isStartOfVariableDeclaration() {
            return this.lookAhead(this.isVariableDeclaration.bind(this));
        }
        isStartOfFunctionDeclaration() {
            return this.lookAhead(this.isFunctionDeclaration.bind(this));
        }
        isStartOfRootStatement() {
            switch (this.token()) {
                case 10:
                case 50:
                case 49:
                    return true;
                case 52:
                    return true;
            }
            if (this.isStartOfVariableDeclaration() || this.isStartOfFunctionDeclaration()) {
                return true;
            }
            return false;
        }
        isListTerminator(kind) {
            if (this.token() === 107) {
                return true;
            }
            switch (kind) {
                case 1:
                case 2:
                    return this.token() === 4;
            }
            return false;
        }
        isListElement(parsingContext, inErrorRecovery) {
            switch (parsingContext) {
                case 0:
                    return this.isStartOfRootStatement();
                case 1:
                    return this.isStartOfStatement();
                case 2:
                case 3:
                    return this.isStartOfVariableDeclaration();
            }
        }
        parseList(kind, parseElement) {
            const saveParsingContext = this.parsingContext;
            this.parsingContext |= 1 << kind;
            const result = this.createNodeArray();
            while (!this.isListTerminator(kind)) {
                if (this.isListElement(kind, false)) {
                    const element = parseElement();
                    result.push(element);
                    continue;
                }
                switch (kind) {
                    case 0:
                        this.parseErrorAtCurrentToken('expected declaration');
                    case 1:
                        this.parseErrorAtCurrentToken('expected declaration or statement');
                    case 2:
                        this.parseErrorAtCurrentToken('expected property declaration');
                }
            }
            result.end = this.scanner.getTokenPos();
            this.parsingContext = saveParsingContext;
            return result;
        }
        createNode(kind, pos) {
            const node = {};
            node.kind = kind;
            node.pos = pos === undefined ? this.scanner.getStartPos() : pos;
            node.end = node.pos;
            return node;
        }
        createNodeArray(elements, pos) {
            const array = (elements || []);
            if (pos === undefined) {
                pos = this.scanner.getStartPos();
            }
            array.pos = pos;
            array.end = pos;
            return array;
        }
        finishNode(node, end) {
            node.end = end === undefined ? this.scanner.getStartPos() : end;
            return node;
        }
        parseLiteral(kind) {
            const node = this.createNode(kind);
            this.parseExpected(kind, undefined, false);
            node.value = this.scanner.getTokenValue();
            this.nextToken();
            this.finishNode(node);
            return node;
        }
        parseInclude() {
            const node = this.createNode(113);
            this.parseExpected(49);
            node.path = this.parseLiteral(2);
            this.finishNode(node);
            return node;
        }
        parseIdentifier() {
            this.parseExpected(108, undefined, false);
            const identifier = this.createNode(108);
            identifier.name = this.scanner.getTokenValue();
            this.nextToken();
            this.finishNode(identifier);
            return identifier;
        }
        parseType() {
            let type;
            if (this.token() === 108) {
                type = this.createNode(109);
                type.name = this.parseIdentifier();
            }
            else if (utils_1.isKeywordTypeKind(this.token())) {
                type = this.createNode(110);
                type.typeKeyword = this.token();
            }
            else {
                throw new Error();
            }
            this.nextToken();
            this.finishNode(type);
            return type;
        }
        parsePropertyDeclaration() {
            const property = this.createNode(118);
            property.type = this.parseType();
            property.name = this.parseIdentifier();
            this.finishNode(property);
            this.parseExpected(10);
            return property;
        }
        parseStructDeclaration() {
            const node = this.createNode(114);
            this.parseExpected(50);
            node.name = this.parseIdentifier();
            this.parseExpected(3);
            node.members = this.parseList(2, this.parsePropertyDeclaration.bind(this));
            this.parseExpected(4);
            this.finishNode(node);
            return node;
        }
        parseModifiers() {
            let mods = Array();
            return mods;
        }
        parseFunctionDeclaration() {
            const fullStart = this.scanner.getTokenPos();
            const modifiers = this.parseModifiers();
            const node = this.createNode(116);
            this.parseExpected(50);
            return node;
        }
        parseStatement() {
            let node;
            switch (this.token()) {
                case 49:
                    node = this.parseInclude();
                    break;
                case 50:
                    node = this.parseStructDeclaration();
                    break;
                case 52:
                case 51:
                case 53:
                case 108:
                case 110:
                    if (this.isStartOfFunctionDeclaration()) {
                        node = this.parseFunctionDeclaration();
                    }
                    else {
                        throw new Error();
                    }
                    break;
                default:
                    throw new Error("unexpected: " + utils_1.getKindName(this.currentToken) + ": " + scanner_1.tokenToString(this.currentToken));
            }
            this.parseExpected(10);
            return node;
        }
        setText(text) {
            this.scanner.setText(text);
        }
        parseFile(fileName, text) {
            this.scanner.setText(text);
            this.sourceFile = this.createNode(111, 0);
            this.sourceFile.fileName = fileName;
            this.nextToken();
            this.sourceFile.statements = this.parseList(0, this.parseStatement.bind(this));
            this.finishNode(this.sourceFile);
            return this.sourceFile;
        }
    }
    exports.Parser = Parser;
});
