# Team Sync - Organization & Team Management System

A full-stack Next.js application for managing organizations, teams, members, and tracking activities with role-based access control.

## 🚀 Features

### Role-Based Access Control
- **Owner**: Create organizations, manage all teams, invite members (admin/member), view all activities
- **Admin**: Create teams, invite members (member only), manage team members, change member roles
- **Member**: View teams they belong to, view team members, view activities

### Core Functionality
- **Organization Management**: Create and manage multiple organizations
- **Team Management**: Create teams within organizations, assign members
- **Invite System**: Email-based invitation system with role assignment
- **Activity Logging**: Track all actions (invites, role changes, team creation, logins)
- **Activity Export**: Export activity logs in CSV or JSON format
- **Real-time Updates**: Auto-refresh activity logs every 5 seconds
- **Toast Notifications**: User feedback for all operations

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components with animations

### Backend
- **API Routes**: Next.js API Routes (App Router)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Cookie-based auth with Supabase Auth
- **Email**: Resend for sending invitations
- **Security**: Row Level Security (RLS) policies

### Database & Auth
- **Supabase**: PostgreSQL database with RLS
- **Service Role Client**: For bypassing RLS when needed
- **Anon Client**: For user-scoped operations

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── check/            # Check auth status
│   │   │   ├── login/            # Login endpoint
│   │   │   ├── logout/           # Logout endpoint
│   │   │   └── me/               # Get current user data
│   │   ├── activity-logs/        # Activity logs endpoint
│   │   ├── invite/               # Invite management
│   │   │   └── [id]/             # Delete invite
│   │   ├── organization/         # Organization management
│   │   │   └── members/          # Organization members
│   │   │       └── [id]/         # Update member role
│   │   └── teams/                # Team management
│   │       └── [id]/members/     # Team members
│   ├── dashboard/                # Dashboard page
│   ├── login/                    # Login page
│   └── page.tsx                  # Root page (auth check & routing)
├── components/                   # React Components
│   ├── ActivityLogs.tsx          # Activity logs with export
│   ├── AdminView.tsx             # Admin dashboard view
│   ├── CreateOrganizationModal.tsx
│   ├── CreateTeamModal.tsx
│   ├── InviteMembersModal.tsx
│   ├── MemberView.tsx            # Member dashboard view
│   ├── OwnerView.tsx             # Owner dashboard view
│   └── Toast.tsx                 # Toast notifications
├── lib/                          # Utility functions
│   ├── email.ts                  # Email sending utilities
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Helper functions
└── types/                        # TypeScript type definitions
    ├── auth.ts
    ├── invite.ts
    └── team.ts
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd team-sync-ensurcex
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. **Set up Supabase Database**
- Create a Supabase project
- Run the SQL schema from `ReadmeSQL` file
- Apply RLS policies from `RLS` file

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

## 🗄️ Database Schema

### Tables
- **profiles**: User profiles (auto-created via trigger)
- **organizations**: Organization information
- **organization_members**: Members in organizations with roles
- **organization_invites**: Pending invitations
- **teams**: Teams within organizations
- **team_members**: Members in teams
- **activity_log**: Activity tracking

### Key Features
- **Automatic Profile Creation**: Database trigger creates profile on user signup
- **RLS Policies**: Row-level security for data access control
- **Cascade Deletion**: Automatic cleanup on user/organization deletion

## 🔐 Authentication Flow

1. User logs in with email/password
2. Server creates HTTP-only cookie with auth data
3. Cookie contains: `profile_id`, `organization_id`, `role`, `full_name`
4. All API routes validate cookie before processing
5. RLS policies enforce additional data access control

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check auth status
- `GET /api/auth/me` - Get current user data

### Organizations
- `GET /api/organization` - Get user's organizations
- `POST /api/organization` - Create organization (owner only)
- `GET /api/organization/members` - Get organization members
- `PATCH /api/organization/members/[id]` - Update member role

### Teams
- `GET /api/teams` - Get teams (supports `?organization_id` query)
- `POST /api/teams` - Create team (owner/admin)
- `GET /api/teams/[id]/members` - Get team members

### Invites
- `GET /api/invite` - Get all invites
- `POST /api/invite` - Send invitation
- `DELETE /api/invite/[id]` - Revoke invitation

### Activity Logs
- `GET /api/activity-logs` - Get activity logs (supports `?organization_id` query)

## 🎨 UI/UX Features

### Color Scheme
- Primary: `#FFA4A4` (Coral Pink)
- Secondary: `#FFBDBD` (Light Pink)
- Background: `#FCF9EA` (Cream)

### Animations
- Fade-in modals
- Slide-up animations
- Hover effects
- Loading spinners
- Auto-refresh indicators

### Responsive Design
- Mobile-friendly layout
- Responsive grid system
- Adaptive navigation

## 🔄 Activity Logging

All significant actions are logged:
- User login
- Member invitation
- Role changes
- Team creation

Activity logs include:
- Action description
- Action type
- Actor information
- Timestamp
- Metadata (name, role)

## 📊 Export Features

Activity logs can be exported in:
- **CSV Format**: For spreadsheet analysis
- **JSON Format**: For programmatic processing

Export includes:
- Action ID
- Action description
- Action type
- User name
- User role
- Timestamp

## 🚦 Role Permissions

### Owner
- ✅ Create organizations
- ✅ Invite admins and members
- ✅ Create teams
- ✅ View all teams and members
- ✅ Change any member's role
- ✅ Access multiple organizations

### Admin
- ✅ Create teams
- ✅ Invite members (member role only)
- ✅ View all teams in organization
- ✅ Change member → admin role
- ✅ View organization members

### Member
- ✅ View teams they belong to
- ✅ View team members
- ✅ View activity logs

## 🛡️ Security Features

- **HTTP-only Cookies**: Prevent XSS attacks
- **RLS Policies**: Database-level security
- **Service Role Client**: Used strategically for admin operations
- **CSRF Protection**: Built-in Next.js protection
- **Environment Variables**: Sensitive data not in code

## 🐛 Known Issues & Solutions

### Next.js 15 Dynamic Routes
- Dynamic route `params` must be awaited
- Fixed in all route handlers: `/api/teams/[id]`, `/api/organization/members/[id]`, `/api/invite/[id]`

### RLS Policy Conflicts
- Some operations require service role client to bypass RLS
- Used for: organization creation, team creation, member management

## 📝 Development Notes

### Adding New Features
1. Create API route in `src/app/api/`
2. Add TypeScript types in `src/types/`
3. Create/update component in `src/components/`
4. Update RLS policies if needed
5. Add activity logging for significant actions

### Testing
1. Test with different roles (owner, admin, member)
2. Test organization switching (owner view)
3. Test activity log export
4. Verify RLS policies
5. Test error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Tailwind CSS for the styling system
- Resend for email delivery

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**
