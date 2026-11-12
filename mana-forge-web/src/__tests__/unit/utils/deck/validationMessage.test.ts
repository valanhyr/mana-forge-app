import { describe, it, expect } from 'vitest';
import { validationMessage } from '../../../../utils/deck/validationMessage';
import type { DeckValidationCode } from '../../../../utils/deck/validateDeck';

const t = (key: string) => `[${key}] {min} {current} {max}`;

describe('validationMessage', () => {
  it('translates every code to its label key', () => {
    const codes: DeckValidationCode[] = [
      'needName',
      'needFormat',
      'commander100',
      'commanderNeeded',
      'noSideboardCommander',
      'minCards',
      'maxCards',
      'maxSideboard',
      'illegalCards',
      'maxCopies',
    ];
    for (const code of codes) {
      expect(validationMessage({ code }, t)).toContain('deckBuilder.validation');
    }
  });

  it('fills the placeholders from params', () => {
    expect(
      validationMessage({ code: 'minCards', params: { min: 60, current: 40 } }, t)
    ).toBe('[deckBuilder.validationMinCards] 60 40 {max}');
    expect(validationMessage({ code: 'maxCopies', params: { max: 4 } }, t)).toBe(
      '[deckBuilder.validationMaxCopies] {min} {current} 4'
    );
  });
});
