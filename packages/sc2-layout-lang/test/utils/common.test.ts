import { assert } from 'vitest';
import { fuzzysearch } from '../../src/common.js';

describe('common', function () {
    it('fuzzysearch', function () {
        assert.isTrue(fuzzysearch('gameui', 'GameUI'));
        assert.isTrue(fuzzysearch('gameui', 'GameUI/Ab'));
        assert.isFalse(fuzzysearch('gameUi', 'GameU'));
        assert.isFalse(fuzzysearch('gAmeui', 'GameIU'));
    });
});
