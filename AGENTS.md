# RADRIS Development Guide

## Build/Test Commands
- **Frontend**: `cd frontend && npm run dev|build|lint|type-check`
- **Backend**: `cd backend && npm run dev|build|lint|type-check`
- **Database**: `cd backend && npm run db:generate|db:push|db:migrate|db:seed|db:reset`
- **Root**: Docker services via `docker-compose up -d`

## Code Style & Conventions
- **TypeScript**: Strict mode, explicit types for function params/returns
- **Imports**: Use `@/` for frontend absolute imports, group external/internal imports
- **Components**: PascalCase, use React.forwardRef for UI components, export interfaces
- **Functions**: camelCase, async/await over promises, proper error handling with try/catch
- **Files**: kebab-case for components, camelCase for utilities, .tsx for React components
- **Styling**: Tailwind CSS with custom medical theme variants, use `cn()` utility for conditional classes
- **API**: RESTful routes with `/api/` prefix, Fastify with Prisma ORM, Zod validation
- **Database**: Prisma schema with proper relations, use transactions for multi-table operations
- **Error Handling**: Global error handlers, structured error responses with timestamps
- **Security**: JWT auth, rate limiting, CORS, helmet middleware, environment variables for secrets

## Architecture
- **Monorepo**: Frontend (Next.js 14), Backend (Fastify), shared types
- **State**: Zustand for client state, React Query for server state, NextAuth for authentication
- **UI**: Radix UI primitives with custom medical theme, shadcn/ui components
- **WebSocket**: Real-time updates for worklist and examination status
- **Reports**: Structured reporting system with hierarchical validation workflow

## Recent Accomplishments (August 2025)

### ✅ Worklist Enhancements (Completed)
- **Advanced Filters**: Global search, date selectors, practitioner filters
- **Column Customization**: Drag & drop column manager, saved views, fixed columns
- **Bulk Actions**: Multi-selection, batch assignment, status changes, multi-format export

### ✅ Structured Reporting System (Completed)
- **ReportEditor**: Template-based editor with auto-save, real-time validation, keyboard shortcuts
- **ValidationWorkflow**: Hierarchical Junior→Senior validation with comments and status tracking
- **ReportVersionHistory**: Complete versioning with comparison, restoration, and timeline
- **ReportViewer**: Professional read-only interface with tabbed navigation
- **NotificationSystem**: Real-time notifications with priority system and quick actions
- **MedicalCodesSelector**: Advanced CCAM/CIM-10/ADICAP code selection with intelligent search
- **Integration**: Smart routing between viewer/editor, worklist integration, error handling

### 📁 Component Structure
```
frontend/src/components/
├── worklist/
│   ├── WorklistFilters.tsx ✅
│   ├── ColumnManager.tsx ✅
│   ├── BulkActions.tsx ✅
│   └── ActionButtons.tsx ✅ (updated)
├── reports/
│   ├── ReportEditor.tsx ✅
│   ├── ValidationWorkflow.tsx ✅
│   ├── ReportVersionHistory.tsx ✅
│   ├── ReportViewer.tsx ✅
│   ├── NotificationSystem.tsx ✅
│   ├── MedicalCodesSelector.tsx ✅
│   ├── AutoSaveIndicator.tsx ✅
│   └── ReportPreview.tsx ✅
└── ui/ (Enhanced with missing Radix components) ✅
```

### 🎯 Current Status
- **Worklist**: Fully functional with advanced features
- **Reports**: Complete structured reporting system with validation workflow
- **Integration**: Seamless navigation between components
- **Build Status**: ✅ TypeScript compilation successful, ✅ Production build working