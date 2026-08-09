import { computeFormFingerprint } from './form-fingerprint';
import type { FormField } from '../../answers/form-schema.types';

/**
 * The fingerprint is what makes "approve now, submit later" honest: if the
 * employer changes the form after the candidate approved it, the approval no
 * longer describes what would be sent, and the runner must re-prepare instead
 * of submitting.
 *
 * So it must be sensitive to everything that changes WHAT IS ASKED, and immune
 * to everything that does not — otherwise it either misses real changes or
 * invalidates good approvals over cosmetics.
 */
describe('computeFormFingerprint', () => {
  const base = (): FormField[] => [
    { name: 'name', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text', required: true },
    {
      name: 'work_auth',
      label: 'Are you authorized to work in the US?',
      type: 'select',
      required: true,
      options: [
        { value: '1', label: 'Yes, without sponsorship' },
        { value: '2', label: 'No, I require sponsorship' },
      ],
    },
  ];

  it('is stable for an identical form', () => {
    expect(computeFormFingerprint(base())).toBe(computeFormFingerprint(base()));
  });

  it('is a bounded hex digest', () => {
    expect(computeFormFingerprint(base())).toMatch(/^[a-f0-9]{32}$/);
  });

  describe('ignores changes that do not alter what is asked', () => {
    it('field order', () => {
      const reordered = [...base()].reverse();

      expect(computeFormFingerprint(reordered)).toBe(computeFormFingerprint(base()));
    });

    it('question wording', () => {
      const reworded = base();
      reworded[2].label = 'Do you have US work authorization?';

      expect(computeFormFingerprint(reworded)).toBe(computeFormFingerprint(base()));
    });

    // An employer fixing "Prefered" -> "Preferred" must not invalidate every
    // pending approval — the choice on offer has not changed.
    it('option label typo fixes', () => {
      const fixed = base();
      fixed[2].options![1].label = 'No, I will require sponsorship';

      expect(computeFormFingerprint(fixed)).toBe(computeFormFingerprint(base()));
    });

    it('option order', () => {
      const swapped = base();
      swapped[2].options!.reverse();

      expect(computeFormFingerprint(swapped)).toBe(computeFormFingerprint(base()));
    });

    it('maxLength and selector metadata', () => {
      const annotated = base();
      annotated[0].maxLength = 100;
      annotated[0].selector = 'input#name';

      expect(computeFormFingerprint(annotated)).toBe(computeFormFingerprint(base()));
    });
  });

  describe('detects changes that DO alter what is asked', () => {
    it('a new field appearing', () => {
      const grown = [...base(), { name: 'why', label: 'Why us?', type: 'textarea', required: true }];

      expect(computeFormFingerprint(grown)).not.toBe(computeFormFingerprint(base()));
    });

    it('a field disappearing', () => {
      const shrunk = base().slice(0, 2);

      expect(computeFormFingerprint(shrunk)).not.toBe(computeFormFingerprint(base()));
    });

    it('a field becoming required', () => {
      const stricter = base();
      stricter[0].required = false;

      expect(computeFormFingerprint(stricter)).not.toBe(computeFormFingerprint(base()));
    });

    it('a control type changing', () => {
      const retyped = base();
      retyped[2].type = 'radio';

      expect(computeFormFingerprint(retyped)).not.toBe(computeFormFingerprint(base()));
    });

    // The one that matters most: the submitted values changed, so an approved
    // answer of "1" may now mean something entirely different.
    it('an option VALUE changing', () => {
      const revalued = base();
      revalued[2].options![0].value = '99';

      expect(computeFormFingerprint(revalued)).not.toBe(computeFormFingerprint(base()));
    });

    it('an option being added', () => {
      const extra = base();
      extra[2].options!.push({ value: '3', label: 'Prefer not to say' });

      expect(computeFormFingerprint(extra)).not.toBe(computeFormFingerprint(base()));
    });
  });

  describe('edge cases', () => {
    it('handles an empty form', () => {
      expect(computeFormFingerprint([])).toMatch(/^[a-f0-9]{32}$/);
    });

    it('handles missing options and names without throwing', () => {
      expect(() =>
        computeFormFingerprint([{ name: '', label: '', type: 'text' } as FormField]),
      ).not.toThrow();
    });
  });
});
