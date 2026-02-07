<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/steward-mark-light.svg">
  <source media="(prefers-color-scheme: light)" srcset="frontend/public/steward-mark.svg">
  <img alt="Steward Logo" src="frontend/public/steward-mark.svg" width="80" height="80">
</picture>

# Steward · ChMS

### Modern Church Management System

*Manage members, families, ministries, events, worship, communication, giving, and reporting — all in one place.*

<br/>

[![Status](https://img.shields.io/badge/Status-Active_Development-10b981?style=for-the-badge)](https://github.com/24Skater/StewardChMS)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

[**Getting Started**](#-getting-started) · 
[**Features**](#-features) · 
[**Architecture**](#-architecture) · 
[**Screenshots**](#-screenshots) · 
[**Contributing**](#-contributing)

<br/>

---

</div>

<br/>

## 🎯 What is Steward · ChMS?

**Steward · ChMS** is a comprehensive, open-source **Church Management System** built for modern ministry teams. Part of the **Steward** ecosystem (alongside **Steward · POS**), it helps churches:

<table>
<tr>
<td width="25%" align="center">
<br/>
<img src="https://api.iconify.design/lucide:users.svg?color=%233b82f6" width="48" height="48" alt="People"/>
<br/><br/>
<strong>Steward People</strong>
<br/>
<sub>Track members, families, and engagement</sub>
<br/><br/>
</td>
<td width="25%" align="center">
<br/>
<img src="https://api.iconify.design/lucide:calendar.svg?color=%2310b981" width="48" height="48" alt="Events"/>
<br/><br/>
<strong>Simplify Admin</strong>
<br/>
<sub>Events, check-in, and scheduling</sub>
<br/><br/>
</td>
<td width="25%" align="center">
<br/>
<img src="https://api.iconify.design/lucide:message-square.svg?color=%23f59e0b" width="48" height="48" alt="Communication"/>
<br/><br/>
<strong>Empower Leaders</strong>
<br/>
<sub>Communication and group tools</sub>
<br/><br/>
</td>
<td width="25%" align="center">
<br/>
<img src="https://api.iconify.design/lucide:bar-chart-3.svg?color=%231e3a5f" width="48" height="48" alt="Reports"/>
<br/><br/>
<strong>Ensure Transparency</strong>
<br/>
<sub>Giving, accounting, and reports</sub>
<br/><br/>
</td>
</tr>
</table>

<br/>

---

## ✨ Features

<details open>
<summary><h3>👥 People & Families</h3></summary>

| Feature | Description |
|---------|-------------|
| **Member Profiles** | Comprehensive CRM with photos, contact info, and custom fields |
| **Household Linking** | Connect family members with relationship tracking |
| **Notes & Tags** | Add private pastoral notes and searchable tags |
| **CSV Import** | Bulk import members from spreadsheets |
| **Search & Filter** | Find anyone instantly with smart search |

</details>

<details>
<summary><h3>🏛️ Ministries & Groups</h3></summary>

| Feature | Description |
|---------|-------------|
| **Ministry Hierarchy** | Organize Church → Ministry → Group structures |
| **Group Management** | Create small groups, classes, and teams |
| **Member Assignment** | Add members to multiple groups |
| **Leader Permissions** | Scope access by ministry or group |

</details>

<details>
<summary><h3>📅 Events & Check-In</h3></summary>

| Feature | Description |
|---------|-------------|
| **Event Scheduling** | One-time and recurring events |
| **Online Registration** | Let members sign up for events |
| **Attendance Tracking** | Manual check-in and QR scanning |
| **Kids Check-In** | Secure child check-in with security codes |
| **Kiosk Mode** | Self-service check-in station |
| **Label Printing** | Print name tags with allergy alerts |

</details>

<details>
<summary><h3>🎵 Worship Planning</h3></summary>

| Feature | Description |
|---------|-------------|
| **Song Library** | Store songs with keys, BPM, and lyrics |
| **Service Plans** | Build worship sets linked to events |
| **Key Transposition** | Track preferred keys for vocalists |
| **Rehearsal Notes** | Add notes for band members |

</details>

<details>
<summary><h3>📣 Communication Center</h3></summary>

| Feature | Description |
|---------|-------------|
| **Email & SMS** | Send messages via email or text |
| **Group Targeting** | Message specific ministries or groups |
| **Templates** | Create reusable message templates |
| **Message History** | Track all sent communications |
| **Opt-In Management** | Respect communication preferences |

</details>

<details>
<summary><h3>💰 Giving & Accounting</h3></summary>

| Feature | Description |
|---------|-------------|
| **Online Giving** | Accept donations via Stripe |
| **Donation Tracking** | Record cash, check, and card gifts |
| **Pledge Management** | Track commitment and fulfillment |
| **Fund Accounting** | Multiple funds with restrictions |
| **Donor Statements** | Generate year-end tax statements |
| **Expense Tracking** | Record and categorize expenses |
| **Vendor Management** | Track payees and payment history |
| **Invoices & POs** | Professional financial documents |

</details>

<details>
<summary><h3>📊 Reports & Analytics</h3></summary>

| Feature | Description |
|---------|-------------|
| **Membership Reports** | Status summaries and missing data alerts |
| **Attendance Reports** | Track trends by event and member |
| **Giving Reports** | Fund totals and donor analytics |
| **Financial Reports** | Income vs. expense summaries |
| **CSV Export** | Download any report as spreadsheet |
| **PDF Generation** | Print-ready formatted reports |

</details>

<details>
<summary><h3>🛒 Sales & Fundraising</h3></summary>

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Manage items for sale |
| **Inventory Tracking** | Real-time stock levels |
| **Simple POS** | Quick point-of-sale transactions |
| **Sales Reports** | Revenue and inventory analysis |

</details>

<br/>

---

## 🏗️ Architecture

<table>
<tr>
<td width="50%">

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool & dev server |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **React Router** | Client-side routing |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | UI component library |
| **TanStack Query** | Server state management |
| **React Hook Form** | Form handling |
| **Zod** | Validation schemas |
| **jsPDF** | PDF generation |

</td>
<td width="50%">

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express** | Web framework |
| **PostgreSQL** | Database |
| **Prisma** | ORM & migrations |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Helmet** | Security headers |
| **Stripe** | Payment processing |
| **Zod** | API validation |

</td>
</tr>
</table>

<br/>

### Design Principles

```
🔐 Security First      Role-based access control on every endpoint
📦 Modular Design      Feature-based code organization
🔗 API-Driven          Clean separation of frontend and backend
📝 Audit-Friendly      Comprehensive logging for compliance
⛪ Church-Specific     Built for ministry, not adapted from generic CRM
```

<br/>

---

## 📁 Repository Structure

```
StewardChMS/
├── 📂 frontend/              # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React context providers
│   │   └── lib/              # Utilities and API client
│   └── public/               # Static assets & logos
│
├── 📂 backend/               # Express API server
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── middleware/       # Auth, rate limiting, etc.
│   │   └── lib/              # Shared utilities
│   └── prisma/
│       ├── schema.prisma     # Database schema
│       └── seed.ts           # Initial data seeding
│
├── 📂 shared/                # Shared types and schemas
│
├── 📂 docs/                  # Documentation
│   ├── spec.md               # System specification
│   ├── decisions.md          # Architecture decision log
│   └── cursor-rules.md       # AI development guidelines
│
├── 📄 docker-compose.yml     # Container orchestration
└── 📄 package.json           # Monorepo root
```

<br/>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (or Docker)
- **npm** 9+

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/24Skater/StewardChMS.git
cd StewardChMS

# 2. Install dependencies
npm install

# 3. Set up environment
cp backend/.env.example backend/.env
# Edit .env with your database URL

# 4. Initialize database
cd backend
npx prisma db push
npx prisma db seed

# 5. Start development servers
cd ..
npm run dev
```

### Using Docker

```bash
# Start with existing PostgreSQL container
docker-compose -f docker-compose.existing-db.yml up -d

# Or start everything fresh
docker-compose up -d
```

### Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3001 |
| **API Health** | http://localhost:3001/api/health |
| **Giving Portal** | http://localhost:5173/give |
| **Kiosk Mode** | http://localhost:5173/kids-checkin/kiosk |

### Default Credentials

```
Email:    admin@example.com
Password: admin123
```

> ⚠️ **Change these immediately in production!**

<br/>

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Token signing secret | Generate for production |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Stripe API key | Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Optional |

### Admin Settings

Configure these in **Admin → Settings** after first login:

- **Branding** - Church name, logo, primary color
- **Email** - SMTP or SendGrid configuration
- **Giving** - Enable online giving, set up Stripe

<br/>

---

## 🧪 Development

### Available Scripts

```bash
# Run all services in development
npm run dev

# Run frontend only
npm run dev -w frontend

# Run backend only
npm run dev -w backend

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Database operations
npm run db:push -w backend    # Push schema
npm run db:seed -w backend    # Seed data
npm run db:studio -w backend  # Open Prisma Studio
```

### Testing

```bash
# Run all tests
npm test

# Run frontend tests
npm test -w frontend

# Run backend tests
npm test -w backend

# Run with coverage
npm test -- --coverage
```

<br/>

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Authentication & RBAC
- [x] Member Management
- [x] Household Linking
- [x] Events & Worship Planning
- [x] Communication Center
- [x] Giving & Accounting
- [x] Reporting & Exports
- [x] Sales & Inventory
- [x] Setup Wizard
- [x] Admin Settings
- [x] Groups & Ministries
- [x] Kids Check-In
- [x] Online Giving Portal
- [x] CI/CD Pipeline

### 🔜 Coming Soon

- [ ] Mobile-responsive improvements
- [ ] Push notifications
- [ ] Calendar integrations
- [ ] Multi-campus support
- [ ] Advanced reporting dashboards
- [ ] Volunteer scheduling

<br/>

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<br/>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<br/>

---

<div align="center">

## ✝️ A Note on Purpose

**Steward · ChMS** was built as an expression of faith in **the Lord Jesus Christ**.

The Church is called to steward people, time, and resources with integrity, excellence, and love. This project exists to serve that calling by providing tools that help churches care well for their communities and operate with transparency and faithfulness.

<br/>

> *"Moreover it is required in stewards, that a man be found faithful."*  
> — **1 Corinthians 4:2** (KJV)

<br/>

---

<sub>Built with ❤️ for the Church</sub>

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/steward-mark-light.svg">
  <source media="(prefers-color-scheme: light)" srcset="frontend/public/steward-mark.svg">
  <img alt="Steward Mark" src="frontend/public/steward-mark.svg" width="32" height="32">
</picture>

</div>
