# Backend Documentation

This is the NestJS backend for PhishGuard AI.

## Technology Stack

- **NestJS 10** - Node.js framework
- **TypeScript** - Type-safe JavaScript
- **TypeORM** - Object-Relational Mapping
- **PostgreSQL** - Relational database
- **Redis** - Cache and job queue
- **Bull** - Job queue library
- **Passport JWT** - Authentication
- **Swagger** - API documentation
- **class-validator** - Schema validation

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── modules/                # Feature modules
│   ├── health/             # Health check
│   ├── auth/               # Authentication
│   ├── users/              # User management
│   ├── campaigns/          # Campaign management
│   └── reports/            # Analytics and reports
├── common/                 # Shared utilities
│   ├── base.entity.ts      # Base entity class
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   ├── guards/             # Auth guards
│   └── interceptors/       # Response interceptors
└── database/               # Database config
    └── migrations/         # Migration files
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Format code
npm run format
```

## Database

### Running Migrations

```bash
# Run all pending migrations
npm run migration:run

# Generate new migration
npm run migration:generate -- -n CreateUserTable

# Revert last migration
npm run migration:revert
```

### Create a New Entity

```typescript
// src/modules/users/user.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;
}
```

## Creating a New Module

### 1. Generate Controller, Service, Module

```bash
nest g module modules/posts
nest g controller modules/posts
nest g service modules/posts
```

### 2. Create DTOs

```typescript
// src/modules/posts/dto/create-post.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
```

### 3. Create Entity

```typescript
// src/modules/posts/entities/post.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/base.entity';

@Entity('posts')
export class Post extends BaseEntity {
  @Column()
  title: string;

  @Column()
  content: string;
}
```

### 4. Implement Service

```typescript
// src/modules/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(createPostDto);
    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find();
  }
}
```

### 5. Implement Controller

```typescript
// src/modules/posts/posts.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Get()
  findAll() {
    return this.postsService.findAll();
  }
}
```

## Authentication

### Protecting Routes

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '@/common/guards/jwt.guard';

@Controller('protected')
@UseGuards(JwtGuard)
export class ProtectedController {
  @Get()
  protectedRoute() {
    return { message: 'This is protected' };
  }
}
```

## API Documentation

Access Swagger UI at: `http://localhost:3001/swagger`

### Adding Swagger Decorators

```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    // Implementation
  }
}
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=phishguard
DB_PASSWORD=changeme123
DB_NAME=phishguard_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
```

## Testing

```bash
# Run unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Build for Production

```bash
npm run build
npm start
```

## Deployment

See root [README.md](../README.md) for deployment instructions.

## Useful Commands

```bash
# Generate module
nest g module modules/module-name

# Generate controller
nest g controller modules/module-name

# Generate service
nest g service modules/module-name

# Generate DTO
nest g class modules/module-name/dto/create-module-name.dto

# Generate entity
nest g class modules/module-name/entities/module-name.entity
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Swagger Documentation](https://swagger.io)
