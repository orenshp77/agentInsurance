import { z } from 'zod'

// SECURITY: Centralized input validation schemas using Zod

// Email validation (RFC 5322 compliant)
export const emailSchema = z.string().email('כתובת אימייל לא תקינה').min(1)

// Phone validation (Israeli format)
export const phoneSchema = z
  .string()
  .regex(/^0\d{1,2}-?\d{7}$/, 'מספר טלפון לא תקין')
  .optional()
  .or(z.literal(''))

// ID number validation (Israeli ID)
export const idNumberSchema = z
  .string()
  .regex(/^\d{9}$/, 'תעודת זהות חייבת להכיל 9 ספרות')
  .optional()
  .or(z.literal(''))

// Name validation (prevent injection attacks)
export const nameSchema = z
  .string()
  .min(2, 'שם חייב להכיל לפחות 2 תווים')
  .max(100, 'שם ארוך מדי')
  .regex(/^[\u0590-\u05FFa-zA-Z\s'-]+$/, 'שם מכיל תווים לא חוקיים')

// Password validation (use the password-validator for detailed checks)
export const passwordSchema = z
  .string()
  .min(12, 'הסיסמה חייבת להכיל לפחות 12 תווים')
  .max(128, 'הסיסמה ארוכה מדי')

// User registration schema
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  idNumber: idNumberSchema,
  agentId: z.string().cuid().optional(),
})

// User update schema (all fields optional except ID)
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  name: nameSchema.optional(),
  phone: phoneSchema,
  idNumber: idNumberSchema,
  logoUrl: z.string().url().optional().or(z.literal('')),
})

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'נא להזין סיסמה'),
})

// File upload validation
export const fileUploadSchema = z.object({
  folderId: z.string().cuid('מזהה תיקייה לא תקין'),
  notes: z.string().max(500, 'הערות ארוכות מדי').optional(),
})

// Folder creation schema
export const createFolderSchema = z.object({
  name: nameSchema,
  category: z.enum(['INSURANCE', 'FINANCE', 'CAR'], {
    errorMap: () => ({ message: 'קטגוריה לא תקינה' }),
  }),
  userId: z.string().cuid('מזהה משתמש לא תקין').optional(),
})

// Password reset request
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Password reset with token
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'טוקן חסר'),
  password: passwordSchema,
})

// Signed URL request
export const signedUrlSchema = z.object({
  fileId: z.string().cuid('מזהה קובץ לא תקין'),
})

// Helper function to validate and return typed data or error
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => e.message).join(', ')
      return { success: false, error: errorMessages }
    }
    return { success: false, error: 'שגיאה באימות נתונים' }
  }
}
