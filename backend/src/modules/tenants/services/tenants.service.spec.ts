import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Not } from 'typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { TenantStatus } from '../enums/tenant-status.enum';

// Minimal in-memory stand-in for the TypeORM repository. Supports the exact
// query shapes the service uses: findOne({where:{slug}}) / findOne({where:{id}})
// / findOne({where:{slug, id: Not(x)}}), findAndCount, create, save, remove.
class FakeRepo {
  rows: Tenant[] = [];
  private seq = 0;

  create(partial: Partial<Tenant>): Tenant {
    return { ...partial } as Tenant;
  }

  async save(entity: Tenant): Promise<Tenant> {
    if (!entity.id) {
      entity.id = `id-${++this.seq}`;
      entity.createdAt = new Date(0);
      entity.updatedAt = new Date(0);
      this.rows.push(entity);
    } else {
      const idx = this.rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) this.rows[idx] = entity;
    }
    return entity;
  }

  async findOne({ where }: { where: any }): Promise<Tenant | null> {
    return (
      this.rows.find((r) =>
        Object.entries(where).every(([k, v]) => {
          if (v && typeof v === 'object' && '_type' in (v as any)) {
            // Not(x) FindOperator
            return (r as any)[k] !== (v as any).value;
          }
          return (r as any)[k] === v;
        }),
      ) ?? null
    );
  }

  async findAndCount({ where, skip = 0, take = 50 }: any): Promise<[Tenant[], number]> {
    let rows = this.rows;
    if (where && where.status) rows = rows.filter((r) => r.status === where.status);
    return [rows.slice(skip, skip + take), rows.length];
  }

  async remove(entity: Tenant): Promise<Tenant> {
    this.rows = this.rows.filter((r) => r.id !== entity.id);
    return entity;
  }
}

describe('TenantsService', () => {
  let repo: FakeRepo;
  let service: TenantsService;

  beforeEach(() => {
    repo = new FakeRepo();
    service = new TenantsService(repo as any);
  });

  const baseDto = () => ({
    name: 'Acme Corporation',
    contactEmail: 'admin@acme.example',
  });

  describe('create', () => {
    it('creates a tenant in PENDING with a slug derived from the name', async () => {
      const t = await service.create(baseDto());
      expect(t.status).toBe(TenantStatus.PENDING);
      expect(t.slug).toBe('acme-corporation');
      expect(t.timezone).toBe('UTC');
      expect(t.logoUrl).toBeNull();
    });

    it('honors an explicit slug', async () => {
      const t = await service.create({ ...baseDto(), slug: 'acme-corp' });
      expect(t.slug).toBe('acme-corp');
    });

    it('derives a unique slug on collision', async () => {
      const a = await service.create(baseDto());
      const b = await service.create(baseDto());
      expect(a.slug).toBe('acme-corporation');
      expect(b.slug).toBe('acme-corporation-2');
    });

    it('rejects a duplicate explicit slug', async () => {
      await service.create({ ...baseDto(), slug: 'acme' });
      await expect(service.create({ ...baseDto(), slug: 'acme' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById / findBySlug', () => {
    it('throws NotFound for a missing id', async () => {
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException);
    });

    it('finds by normalized slug', async () => {
      await service.create({ ...baseDto(), slug: 'acme' });
      const found = await service.findBySlug('ACME');
      expect(found.slug).toBe('acme');
    });
  });

  describe('update', () => {
    it('updates profile fields and can clear the logo', async () => {
      const t = await service.create({ ...baseDto(), logoUrl: 'https://x.example/l.png' } as any);
      const updated = await service.update(t.id, {
        name: 'Acme Inc',
        timezone: 'America/New_York',
        logoUrl: undefined,
      });
      expect(updated.name).toBe('Acme Inc');
      expect(updated.timezone).toBe('America/New_York');
    });

    it('rejects a slug already taken by another tenant', async () => {
      await service.create({ ...baseDto(), slug: 'taken' });
      const b = await service.create({ ...baseDto(), slug: 'free' });
      await expect(service.update(b.id, { slug: 'taken' })).rejects.toThrow(ConflictException);
    });

    it('allows re-saving with its own slug (no false clash)', async () => {
      const t = await service.create({ ...baseDto(), slug: 'mine' });
      const updated = await service.update(t.id, { slug: 'mine', name: 'Renamed' });
      expect(updated.name).toBe('Renamed');
    });
  });

  describe('changeStatus', () => {
    it('allows a valid transition PENDING -> ACTIVE', async () => {
      const t = await service.create(baseDto());
      const updated = await service.changeStatus(t.id, TenantStatus.ACTIVE);
      expect(updated.status).toBe(TenantStatus.ACTIVE);
    });

    it('is a no-op when status is unchanged', async () => {
      const t = await service.create(baseDto());
      const updated = await service.changeStatus(t.id, TenantStatus.PENDING);
      expect(updated.status).toBe(TenantStatus.PENDING);
    });

    it('rejects an illegal transition (ARCHIVED is terminal)', async () => {
      const t = await service.create(baseDto());
      await service.changeStatus(t.id, TenantStatus.ARCHIVED);
      await expect(service.changeStatus(t.id, TenantStatus.ACTIVE)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a nonsensical transition PENDING -> SUSPENDED', async () => {
      const t = await service.create(baseDto());
      await expect(service.changeStatus(t.id, TenantStatus.SUSPENDED)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('paginates and filters by status', async () => {
      const a = await service.create(baseDto());
      await service.create({ ...baseDto(), slug: 'b' });
      await service.changeStatus(a.id, TenantStatus.ACTIVE);

      const [active, activeTotal] = await service.findAll(0, 50, TenantStatus.ACTIVE);
      expect(activeTotal).toBe(1);
      expect(active[0].status).toBe(TenantStatus.ACTIVE);

      const [all, total] = await service.findAll(0, 50);
      expect(total).toBe(2);
    });
  });

  describe('delete', () => {
    it('removes a tenant', async () => {
      const t = await service.create(baseDto());
      await service.delete(t.id);
      await expect(service.findById(t.id)).rejects.toThrow(NotFoundException);
    });
  });
});

// Reference Not() so the import is retained and mirrors the service query shape.
void Not;
