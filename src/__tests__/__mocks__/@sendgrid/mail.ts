/**
 * Mock für @sendgrid/mail
 * Wird in Email-Versand-Tests verwendet
 */

// Mock-Funktionen
export const mockSend = jest.fn(() => Promise.resolve([
  {
    statusCode: 202,
    body: '',
    headers: {}
  }
]));

export const mockSetApiKey = jest.fn();

// Mock für sendMultiple (falls benötigt)
export const mockSendMultiple = jest.fn(() => Promise.resolve([
  {
    statusCode: 202,
    body: '',
    headers: {}
  }
]));

// SendGrid Mail Service Mock
class MailServiceMock {
  setApiKey = mockSetApiKey;
  send = mockSend;
  sendMultiple = mockSendMultiple;
}

// Default Export (wie @sendgrid/mail)
const mailService = new MailServiceMock();
export default mailService;

// Helper-Funktion: Erfolgreichen Versand simulieren
export const mockSuccessfulSend = (emailData?: any) => {
  mockSend.mockResolvedValueOnce([
    {
      statusCode: 202,
      body: '',
      headers: {},
      ...emailData
    }
  ]);
};

// Helper-Funktion: Fehlgeschlagenen Versand simulieren
export const mockFailedSend = (error: any = new Error('SendGrid error')) => {
  mockSend.mockRejectedValueOnce(error);
};

// Helper-Funktion: SendGrid Rate-Limit Error simulieren
export const mockRateLimitError = () => {
  const rateLimitError: any = new Error('Rate limit exceeded');
  rateLimitError.code = 429;
  rateLimitError.response = {
    statusCode: 429,
    body: {
      errors: [{
        message: 'Rate limit exceeded',
        field: null,
        help: null
      }]
    }
  };
  mockSend.mockRejectedValueOnce(rateLimitError);
};

// Helper-Funktion: Prüfen, ob Email mit korrekten Parametern gesendet wurde
export const expectEmailSent = (expectedParams: {
  to?: string | string[];
  subject?: string;
  from?: string | { email: string; name: string };
  html?: string;
  text?: string;
  attachments?: any[];
}) => {
  expect(mockSend).toHaveBeenCalled();
  const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1] as any[] | undefined;
  const sentEmail = lastCall?.[0];

  if (!sentEmail) {
    throw new Error('Keine Email-Daten gefunden');
  }

  if (expectedParams.to) {
    expect(sentEmail.to).toEqual(expectedParams.to);
  }
  if (expectedParams.subject) {
    expect(sentEmail.subject).toBe(expectedParams.subject);
  }
  if (expectedParams.from) {
    expect(sentEmail.from).toEqual(expectedParams.from);
  }
  if (expectedParams.html) {
    expect(sentEmail.html).toContain(expectedParams.html);
  }
  if (expectedParams.text) {
    expect(sentEmail.text).toContain(expectedParams.text);
  }
  if (expectedParams.attachments) {
    expect(sentEmail.attachments).toHaveLength(expectedParams.attachments.length);
  }
};

// Helper-Funktion: Alle Mocks zurücksetzen
export const resetSendGridMocks = () => {
  mockSend.mockClear();
  mockSetApiKey.mockClear();
  mockSendMultiple.mockClear();
};
