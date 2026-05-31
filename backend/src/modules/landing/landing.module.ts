import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPage } from './entities/landing-page.entity';
import { LandingPageService } from './services/landing-page.service';
import { LandingPagesController } from './controllers/landing-pages.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage]), AuthModule],
  providers: [LandingPageService],
  controllers: [LandingPagesController],
  exports: [LandingPageService, TypeOrmModule],
})
export class LandingModule {}
