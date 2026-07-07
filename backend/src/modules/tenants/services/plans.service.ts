import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';
import { PlanTier } from '../enums/plan-tier.enum';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    // Only the CUSTOM tier may have multiple plan rows; the three built-in tiers
    // are singletons seeded on startup.
    if (dto.tier !== PlanTier.CUSTOM) {
      const existing = await this.plans.findOne({ where: { tier: dto.tier } });
      if (existing) {
        throw new ConflictException(`A '${dto.tier}' plan already exists; update it instead`);
      }
    }
    const plan = this.plans.create({
      ...dto,
      description: dto.description ?? null,
      defaultFeatures: dto.defaultFeatures ?? [],
    });
    return this.plans.save(plan);
  }

  async findAll(includeInactive = false): Promise<Plan[]> {
    return this.plans.find({
      where: includeInactive ? {} : { isActive: true },
      order: { tier: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findById(id);
    Object.assign(plan, {
      ...dto,
      description: dto.description !== undefined ? dto.description : plan.description,
    });
    return this.plans.save(plan);
  }

  async delete(id: string): Promise<void> {
    const plan = await this.findById(id);
    const inUse = await this.tenants.count({ where: { planId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete a plan assigned to ${inUse} tenant(s); reassign them first`,
      );
    }
    await this.plans.remove(plan);
  }
}
