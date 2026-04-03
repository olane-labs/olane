/**
 * Copass ID validation and resolution.
 *
 * Copass IDs are human-readable identifiers linked to o:// addresses.
 * Validation rules: 3-30 chars, lowercase alphanumeric + hyphens/underscores,
 * no consecutive special chars, must start/end with alphanumeric.
 */

const COPASS_ID_REGEX = /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

export interface CopassIdValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCopassId(id: string): CopassIdValidationResult {
  const errors: string[] = [];

  if (id.length < MIN_LENGTH) {
    errors.push(`Must be at least ${MIN_LENGTH} characters`);
  }
  if (id.length > MAX_LENGTH) {
    errors.push(`Must be at most ${MAX_LENGTH} characters`);
  }
  if (!COPASS_ID_REGEX.test(id)) {
    errors.push(
      'Must be lowercase alphanumeric with hyphens/underscores, starting and ending with alphanumeric',
    );
  }
  if (/[-_]{2,}/.test(id)) {
    errors.push('Cannot contain consecutive special characters');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Link a Copass ID to an address in the address book.
 * This is a convenience wrapper — the actual storage is in the AddressBook.
 */
export interface CopassIdMapping {
  copassId: string;
  address: string;
  linkedAt: string;
}

export function createCopassIdMapping(
  copassId: string,
  address: string,
): CopassIdMapping {
  const validation = validateCopassId(copassId);
  if (!validation.valid) {
    throw new Error(
      `Invalid Copass ID '${copassId}': ${validation.errors.join(', ')}`,
    );
  }
  return {
    copassId,
    address,
    linkedAt: new Date().toISOString(),
  };
}
