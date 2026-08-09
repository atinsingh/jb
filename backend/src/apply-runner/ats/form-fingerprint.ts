import { createHash } from 'crypto';
import type { FormField } from '../../answers/form-schema.types';

/**
 * Fingerprint a form's STRUCTURE.
 *
 * "Prepare now, approve later" means an application can sit for days between
 * being filled and being submitted. Before the submit click the runner
 * re-introspects and compares fingerprints: a mismatch means the employer
 * changed the form after the candidate approved it, so the approval no longer
 * describes what would be sent. That is the check that makes approving
 * yesterday's screenshot honest.
 *
 * Deliberately covers structure only — field names, types, requiredness and the
 * option values on offer. It must NOT include current values, or every fill
 * would invalidate its own fingerprint. Option LABELS are excluded too: an
 * employer fixing a typo in "Prefered not to say" should not invalidate a
 * pending approval, because the choice on offer has not changed.
 */
export function computeFormFingerprint(fields: FormField[]): string {
  const descriptors = (fields || [])
    .map((f) => {
      const options = (f.options || [])
        .map((o) => String(o.value ?? ''))
        .sort()
        .join(',');
      return [
        String(f.name || ''),
        String(f.type || ''),
        f.required ? 'req' : 'opt',
        options,
      ].join('|');
    })
    // Sorted so a cosmetic reorder of the page does not read as a change.
    .sort();

  return createHash('sha256').update(descriptors.join('\n')).digest('hex').slice(0, 32);
}
