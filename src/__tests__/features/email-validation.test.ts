import { validateEmail, validateEmailList } from '@/lib/email-utils'

describe('E-Mail Validierung', () => {
  describe('validateEmail', () => {
    it('sollte gültige E-Mail-Adressen akzeptieren', () => {
      const validEmails = [
        'user@example.com',
        'test.user@company.co.uk',
        'first+last@domain.com',
        'user123@subdomain.example.org'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('sollte ungültige E-Mail-Adressen ablehnen', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
        null,
        undefined
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email as any)).toBe(false)
      })
    })
  })

  describe('validateEmailList', () => {
    it('sollte eine Liste von E-Mails validieren', () => {
      const emails = [
        'valid@example.com',
        'invalid@',
        'another.valid@test.com'
      ]

      const result = validateEmailList(emails)
      
      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0]).toBe('invalid@')
    })

    it('sollte Duplikate entfernen', () => {
      const emails = [
        'test@example.com',
        'test@example.com',
        'unique@example.com'
      ]

      const result = validateEmailList(emails)
      
      expect(result.valid).toHaveLength(2)
      expect(result.duplicates).toHaveLength(1)
    })
  })
})