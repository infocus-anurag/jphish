import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingPage } from '../entities/landing-page.entity';
import { CreateLandingPageDto, UpdateLandingPageDto } from '../dto/landing-page.dto';
import { User } from '@/modules/auth/entities/user.entity';
import { UserRole } from '@/modules/auth/enums/user-role.enum';

@Injectable()
export class LandingPageService {
  constructor(
    @InjectRepository(LandingPage) private readonly pages: Repository<LandingPage>,
  ) {}

  async create(dto: CreateLandingPageDto, creator: User): Promise<LandingPage> {
    if (await this.pages.findOne({ where: { name: dto.name } })) {
      throw new ConflictException('A landing page with this name already exists');
    }
    if (await this.pages.findOne({ where: { slug: dto.slug } })) {
      throw new ConflictException('Slug is already in use');
    }
    const page = this.pages.create({ ...dto, createdById: creator.id });
    return this.pages.save(page);
  }

  async findAll(skip = 0, take = 50): Promise<[LandingPage[], number]> {
    return this.pages.findAndCount({ skip, take, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<LandingPage> {
    const page = await this.pages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async findBySlug(slug: string): Promise<LandingPage> {
    const page = await this.pages.findOne({ where: { slug, isActive: true } });
    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async update(id: string, dto: UpdateLandingPageDto, user: User): Promise<LandingPage> {
    const page = await this.pages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (page.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only update landing pages you created');
    }
    if (dto.name && dto.name !== page.name) {
      if (await this.pages.findOne({ where: { name: dto.name } })) {
        throw new ConflictException('Name already in use');
      }
    }
    Object.assign(page, dto);
    return this.pages.save(page);
  }

  async delete(id: string, user: User): Promise<void> {
    const page = await this.pages.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (page.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('You can only delete landing pages you created');
    }
    await this.pages.remove(page);
  }
}
