export function humanize(key: string) {
    return key
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Convert camelCase to words
        .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase()) // Capitalize the first letter of each word
        .trim() // Trim any leading/trailing spaces
        .replace(/\s\s+/g, ' ') // Replace multiple spaces with a single space
}
