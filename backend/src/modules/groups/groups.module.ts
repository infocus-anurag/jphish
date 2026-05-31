import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupsService } from './services/groups.service';
import { GroupsController } from './controllers/groups.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember]), AuthModule],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService, TypeOrmModule],
})
export class GroupsModule {}
