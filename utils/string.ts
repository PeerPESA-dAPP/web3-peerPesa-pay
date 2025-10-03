/**
 * Utility functions for string manipulation
 */

/**
 * Get the first 2 initials from a full name
 * @param name - The full name string
 * @returns First 2 initials in uppercase, or empty string if invalid input
 * 
 * Examples:
 * - "John Doe" -> "JD"
 * - "Jane" -> "JA"
 * - "Mary Jane Smith" -> "MJ"
 * - "" or null -> ""
 */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return ''
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0)
  if (words.length === 0) return ''
  
  if (words.length === 1) {
    // Single word - return first 2 characters
    return words[0].substring(0, 2).toUpperCase()
  }
  
  // Multiple words - return first character of first 2 words
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Format a name by capitalizing the first letter of each word
 */
export const formatName = (name: string): string => {
  if (!name || typeof name !== 'string') return ''
  
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
