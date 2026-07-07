import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';
import {
  TenantStatus,
  TENANT_STATUS_TRANSITIONS,
} from '../enums/tenant-status.enum';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const slug = dto.slug ? this.normalizeSlug(dto.slug) : await this.deriveUniqueSlug(dto.name);
    await this.ensureSlugFree(slug);

    const tenant = this.tenants.create({
      name: dto.name,
      slug,
      contactEmail: dto.contactEmail,
      timezone: dto.timezone ?? 'UTC',
      logoUrl: dto.logoUrl ?? null,
      status: TenantStatus.PENDING,
    });
    return this.tenants.save(tenant);
  }

  async findAll(skip = 0, take = 50, status?: TenantStatus): Promise<[Tenant[], number]> {
    return this.tenants.findAndCount({
      where: status ? { status } : {},
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { slug: this.normalizeSlug(slug) } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);

    if (dto.slug) {
      const slug = this.normalizeSlug(dto.slug);
      if (slug !== tenant.slug) {
        await this.ensureSlugFree(slug, id);
        tenant.slug = slug;
      }
    }
    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.contactEmail !== undefined) tenant.contactEmail = dto.contactEmail;
    if (dto.timezone !== undefined) tenant.timezone = dto.timezone;
    if (dto.logoUrl !== undefined) tenant.logoUrl = dto.logoUrl ?? null;

    return this.tenants.save(tenant);
  }

  async changeStatus(id: string, next: TenantStatus): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (tenant.status === next) return tenant;

    const allowed = TENANT_STATUS_TRANSITIONS[tenant.status];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition tenant from '${tenant.status}' to '${next}'`,
      );
    }
    tenant.status = next;
    return this.tenants.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.tenants.remove(tenant);
  }

  private async ensureSlugFree(slug: string, exceptId?: string): Promise<void> {
    const clash = await this.tenants.findOne({
      where: exceptId ? { slug, id: Not(exceptId) } : { slug },
    });
    if (clash) throw new ConflictException('A tenant with this slug already exists');
  }

  private async deriveUniqueSlug(name: string): Promise<string> {
    const base = this.normalizeSlug(name) || 'tenant';
    let candidate = base;
    let n = 2;
    // Append a numeric suffix until the slug is free. Bounded to avoid a runaway
    // loop if something pathological happens.
    while (await this.tenants.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${n++}`;
      if (n > 1000) throw new ConflictException('Unable to derive a unique slug');
    }
    return candidate;
  }

  private normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)
      .replace(/-+$/g, '');
  }
}
