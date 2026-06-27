import { assert } from 'chai';
import 'mocha';
import { fuzzysearch } from '../../src/common';

describe('common', function () {
    it('fuzzysearch', function () {
        assert.isTrue(fuzzysearch('gameui', 'GameUI'));
        assert.isTrue(fuzzysearch('gameui', 'GameUI/Ab'));
        assert.isFalse(fuzzysearch('gameUi', 'GameU'));
        assert.isFalse(fuzzysearch('gAmeui', 'GameIU'));
    });
});
