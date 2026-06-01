/** Minimum age required to create an account. Set to 16 to clear both COPPA
 *  (US, 13) and the strictest GDPR digital-consent ages without parental consent. */
export const MINIMUM_AGE = 16;

/**
 * Computes a whole-number age from a birthdate. Purely local — the birthdate is
 * never stored or transmitted, so we don't collect data from under-13s.
 */
export function getAge(birth: Date, now: Date = new Date()): number {
    let age = now.getFullYear() - birth.getFullYear();
    const monthDelta = now.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
        age -= 1;
    }
    return age;
}
