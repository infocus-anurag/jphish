# PhishGuard AI Development Guidelines

## Code Style

### TypeScript

- Use strict mode: `"strict": true`
- Always specify return types for functions
- Use interfaces over types for objects
- Prefix private properties with `_`

### Naming Conventions

- **Files**: kebab-case (user.service.ts)
- **Classes**: PascalCase (UserService)
- **Functions/Methods**: camelCase (getUser)
- **Constants**: UPPER_SNAKE_CASE (MAX_RETRIES)

### Backend Structure

```
module/
├── module.controller.ts      # Route handlers
├── module.service.ts         # Business logic
├── module.module.ts          # Module definition
├── dto/                      # Data transfer objects
│   ├── create-module.dto.ts
│   └── update-module.dto.ts
├── entities/                 # Database entities
│   └── module.entity.ts
└── module.spec.ts           # Unit tests
```

### Frontend Structure

```
feature/
├── components/
│   ├── [Feature]Card.tsx
│   ├── [Feature]Form.tsx
│   └── index.ts
├── hooks/
│   └── use[Feature].ts
├── types/
│   └── [feature].types.ts
└── services/
    └── [feature].service.ts
```

## Git Workflow

### Branch Naming

```
feature/description          # New feature
bugfix/description          # Bug fix
hotfix/description          # Production hotfix
docs/description            # Documentation
refactor/description        # Code refactoring
```

### Commit Messages

```
[TYPE] Description of change

feat: Add user authentication
fix: Resolve database connection issue
docs: Update API documentation
refactor: Improve error handling
test: Add unit tests for auth service
```

## Testing

- Minimum 80% code coverage
- Test business logic, not implementation
- Use descriptive test names
- Mock external dependencies

## Performance

- Code splitting in frontend
- Database query optimization
- Caching strategies with Redis
- API response compression

## Security

- Always validate user input
- Use prepared statements (TypeORM)
- Hash passwords with bcrypt
- Sanitize HTML/XSS prevention
- CORS configuration
- Rate limiting for APIs
- Environment variables for secrets

## Documentation

- Add JSDoc comments to functions
- Document API endpoints in Swagger
- Include examples in comments
- Keep README updated

## PR Review Checklist

- [ ] Code follows style guide
- [ ] Tests pass and new tests added
- [ ] No console.log in production code
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Performance impact considered
