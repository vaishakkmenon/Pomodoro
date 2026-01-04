/**
 * Safely parses a JSON string with optional type validation.
 * Returns null if parsing fails or validation fails.
 *
 * @param raw - The raw JSON string to parse (can be null)
 * @param validate - Optional type guard function to validate the parsed data
 * @returns The parsed and validated data, or null on failure
 */
export function safeParseJSON<T>(
    raw: string | null,
    validate?: (data: unknown) => data is T
): T | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (validate && !validate(parsed)) return null;
        return parsed as T;
    } catch {
        return null;
    }
}
