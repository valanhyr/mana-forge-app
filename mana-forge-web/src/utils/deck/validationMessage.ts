import type { DeckValidationError } from './validateDeck';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const template = (text: string, params: Record<string, number> = {}): string =>
  Object.entries(params).reduce((out, [name, value]) => out.replace('{' + name + '}', String(value)), text);

export const validationMessage = (error: DeckValidationError, t: Translate): string => {
  switch (error.code) {
    case 'needName':
      return t('deckBuilder.validationNeedName');
    case 'needFormat':
      return t('deckBuilder.validationNeedFormat');
    case 'commander100':
      return t('deckBuilder.validationCommander100');
    case 'commanderNeeded':
      return t('deckBuilder.validationCommanderNeeded');
    case 'noSideboardCommander':
      return t('deckBuilder.validationNoSideboardCommander');
    case 'minCards':
      return template(t('deckBuilder.validationMinCards'), error.params);
    case 'maxCards':
      return template(t('deckBuilder.validationMaxCards'), error.params);
    case 'maxSideboard':
      return template(t('deckBuilder.validationMaxSideboard'), error.params);
    case 'illegalCards':
      return t('deckBuilder.validationIllegalCards');
    case 'maxCopies':
      return template(t('deckBuilder.validationMaxCopies'), error.params);
  }
};
