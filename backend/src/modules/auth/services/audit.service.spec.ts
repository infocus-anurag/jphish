import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';

function makeRepoMock() {
  return {
    create: jest.fn((row) => row),
    save: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repo = makeRepoMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  it('persists the audit row with metadata + context', async () => {
    await service.record({
      action: 'auth.login.success',
      actorId: 'a-1',
      actorEmail: 'a@b.test',
      metadata: { foo: 'bar' },
      ctx: { ip: '1.2.3.4', userAgent: 'jest' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.success',
        actorId: 'a-1',
        actorEmail: 'a@b.test',
        metadata: { foo: 'bar' },
        ip: '1.2.3.4',
        userAgent: 'jest',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('truncates user-agent to 255 chars to fit the column', async () => {
    const long = 'x'.repeat(400);
    await service.record({ action: 'auth.logout', ctx: { userAgent: long } });
    const arg = (repo.create as jest.Mock).mock.calls[0][0];
    expect(arg.userAgent).toHaveLength(255);
  });

  it('swallows DB errors so audit failures cannot break the request', async () => {
    repo.save.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.record({ action: 'auth.login.failed' }),
    ).resolves.toBeUndefined();
  });

  it('list caps the limit at 500', async () => {
    await service.list(99999);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 }),
    );
  });
});
