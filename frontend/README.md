# Frontend Documentation

This is the Next.js frontend for PhishGuard AI.

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling
- **ShadCN/UI** - Component library
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **TanStack Query** - Server state management
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/     # Reusable React components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
├── store/          # Zustand stores
├── styles/         # CSS and Tailwind
└── types/          # TypeScript definitions

app/               # Next.js App Router pages
├── layout.tsx      # Root layout
└── page.tsx        # Home page
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

## Development

### Creating a New Page

```bash
# Create new route in app/ directory
# app/new-page/page.tsx

export default function NewPage() {
  return <h1>New Page</h1>;
}
```

### Creating a New Component

```bash
# Create component in src/components/
# src/components/MyComponent.tsx

export default function MyComponent() {
  return <div>My Component</div>;
}
```

### Using State Management

```typescript
import { useAuthStore } from '@/store/auth.store';

export default function Profile() {
  const { user, isAuthenticated } = useAuthStore();
  return <div>{user?.email}</div>;
}
```

### Using the API

```typescript
import apiClient from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export default function Data() {
  const { data } = useQuery({
    queryKey: ['data'],
    queryFn: () => apiClient.get('/endpoint'),
  });
  return <div>{data?.data}</div>;
}
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Build for Production

```bash
npm run build
npm start
```

## Deployment

See root [README.md](../README.md) for deployment instructions.
