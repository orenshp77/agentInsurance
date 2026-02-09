// SECURITY: Strong password policy validator

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  // Minimum length: 12 characters (industry best practice)
  if (password.length < 12) {
    errors.push('הסיסמה חייבת להכיל לפחות 12 תווים')
  }

  // Maximum length: 128 characters (prevent DoS attacks)
  if (password.length > 128) {
    errors.push('הסיסמה ארוכה מדי (מקסימום 128 תווים)')
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל לפחות אות אחת קטנה באנגלית (a-z)')
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל לפחות אות אחת גדולה באנגלית (A-Z)')
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל לפחות ספרה אחת (0-9)')
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('הסיסמה חייבת להכיל לפחות תו מיוחד אחד (!@#$%^&* וכו\')')
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password123', '123456789012', 'qwerty123456', 'admin123456',
    'welcome123456', 'password1234', '1234567890ab', 'abcd1234!@#$'
  ]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('סיסמה זו נפוצה מדי, אנא בחר סיסמה ייחודית יותר')
  }

  // Check for repeating characters (e.g., "aaaaaa")
  if (/(.)\1{4,}/.test(password)) {
    errors.push('הסיסמה לא יכולה להכיל יותר מ-4 תווים זהים ברצף')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper function to get password strength score (0-100)
export function getPasswordStrength(password: string): number {
  let score = 0

  // Length bonus
  score += Math.min(password.length * 2, 30)

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15

  // Extra complexity bonus
  const uniqueChars = new Set(password).size
  score += Math.min(uniqueChars, 10)

  return Math.min(score, 100)
}
