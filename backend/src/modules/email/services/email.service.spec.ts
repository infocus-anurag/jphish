import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmtpProfile } from '../entities/smtp-profile.entity';

/** A ConfigService stub backed by a plain map. */
function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T = string>(key: string): T => values[key] as unknown as T,
  } as unknown as ConfigService;
}

function makeProfile(overrides: Partial<SmtpProfile> = {}): SmtpProfile {
  return {
    id: 'profile-1',
    name: 'Test profile',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'someone@gmail.com',
    password: 'secret',
    fromEmail: 'noreply@mg.example.com',
    fromName: 'PhishGuard',
    ...overrides,
  } as SmtpProfile;
}

/** Build a fake fetch Response. */
function fakeResponse(init: {
  ok: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}): Response {
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    json: async () => init.json ?? {},
    text: async () => init.text ?? '',
  } as unknown as Response;
}

describe('EmailService — Mailgun provider', () => {
  const MAILGUN_ENV = {
    MAIL_PROVIDER: 'mailgun',
    MAILGUN_API_KEY: 'key-test',
    MAILGUN_DOMAIN: 'mg.example.com',
    MAILGUN_API_HOST: 'api.mailgun.net',
  };

  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('testSmtpConnection', () => {
    it('verifies via the Mailgun domains REST endpoint and returns true', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, json: { domain: {} } }));
      const service = new EmailService(configWith(MAILGUN_ENV));

      await expect(service.testSmtpConnection(makeProfile())).resolves.toBe(true);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.mailgun.net/v3/domains/mg.example.com');
      expect((opts.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    });

    it('uses the EU host when MAILGUN_API_HOST is set to the EU endpoint', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true }));
      const service = new EmailService(
        configWith({ ...MAILGUN_ENV, MAILGUN_API_HOST: 'api.eu.mailgun.net' }),
      );

      await service.testSmtpConnection(makeProfile());

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.eu.mailgun.net/v3/domains/mg.example.com');
    });

    it('throws BadRequestException when the Mailgun API rejects the credentials', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401, text: 'Forbidden' }));
      const service = new EmailService(configWith(MAILGUN_ENV));

      await expect(service.testSmtpConnection(makeProfile())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws when MAIL_PROVIDER=mailgun but credentials are missing', async () => {
      const service = new EmailService(configWith({ MAIL_PROVIDER: 'mailgun' }));

      await expect(service.testSmtpConnection(makeProfile())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('POSTs to the Mailgun messages endpoint with the rendered fields and headers', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: true, json: { id: '<msg-123@mg.example.com>', message: 'Queued' } }),
      );
      const service = new EmailService(configWith(MAILGUN_ENV));

      const result = await service.sendEmail(
        'victim@example.com',
        'Quarterly review',
        '<p>hello</p>',
        'hello',
        makeProfile(),
        { 'X-Campaign-ID': 'camp-1', 'List-Unsubscribe': '<https://x/report>' },
      );

      expect(result.messageId).toBe('<msg-123@mg.example.com>');
      expect(result.accepted).toBe(true);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.mailgun.net/v3/mg.example.com/messages');
      expect(opts.method).toBe('POST');

      const body = new URLSearchParams(opts.body as string);
      expect(body.get('to')).toBe('victim@example.com');
      expect(body.get('subject')).toBe('Quarterly review');
      expect(body.get('html')).toBe('<p>hello</p>');
      expect(body.get('from')).toBe('PhishGuard <noreply@mg.example.com>');
      // Custom headers are sent with Mailgun's "h:" prefix.
      expect(body.get('h:X-Campaign-ID')).toBe('camp-1');
      expect(body.get('h:List-Unsubscribe')).toBe('<https://x/report>');
    });

    it('rejects when the Mailgun API returns a non-2xx status', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 400, text: 'bad domain' }));
      const service = new EmailService(configWith(MAILGUN_ENV));

      await expect(
        service.sendEmail('victim@example.com', 's', '<p>h</p>', null, makeProfile()),
      ).rejects.toThrow(/Mailgun API 400/);
    });

    it('reuses a single cached transporter across sends', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, json: { id: 'x' } }));
      const service = new EmailService(configWith(MAILGUN_ENV));
      const buildSpy = jest.spyOn(
        service as unknown as { buildMailgunTransporter: () => unknown },
        'buildMailgunTransporter',
      );

      await service.sendEmail('a@example.com', 's', '<p>h</p>', null, makeProfile());
      await service.sendEmail('b@example.com', 's', '<p>h</p>', null, makeProfile());

      expect(buildSpy).toHaveBeenCalledTimes(1);
    });
  });
});
