<div align="center">

# 🕊️ StewardChMS

**Modern Church Management System**

Manage members, families, ministries, events, worship, communication, giving, and reporting — all in one place.

[Getting Started](#-getting-started) •
[Features](#-features) •
[Architecture](#-architecture) •
[Development](#-development-workflow) •
[Roadmap](#-roadmap)

---

![Status](https://img.shields.io/badge/status-active-success)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)
![React](https://img.shields.io/badge/react-18-blue)
![Vite](https://img.shields.io/badge/vite-5-purple)
![Tailwind](https://img.shields.io/badge/tailwindcss-3.x-teal)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ What is StewardChMS?

**StewardChMS** is a **standalone Church Management System** built as part of the **Steward** ecosystem (alongside **StewardPOS**).

It is designed to help churches:
- steward people well
- simplify administration
- empower ministry leaders
- maintain financial transparency

Built with a **modern frontend stack** and a **clean modular backend**, StewardChMS scales from small churches to large multi-ministry organizations.

---

## 🚀 Features

### 👥 People & Families
- Member CRM with profiles, tags, and notes
- Family / household linking
- Attendance and engagement tracking

### 🏛️ Ministries & Groups
- Church → Ministry → Group hierarchy
- Group-level events and messaging
- Leader-scoped permissions

### 📅 Events & Worship
- One-time and recurring events
- Event registration and check-in
- Worship planning with song library and service plans

### 📣 Communication Center
- Email and SMS messaging
- Group-based targeting
- Templates and message history

### 💰 Giving & Accounting
- Donations and pledges
- Fund accounting
- Expenses, vendors, invoices, and POs
- Donor statements and financial reports

### 📊 Reporting
- Attendance reports
- Giving summaries
- Volunteer and ministry insights
- CSV and PDF exports

### 🛒 Sales & Fundraising
- Product catalog and inventory
- Simple POS sales
- Fundraising event tracking
- Financial reporting integration

---

## 🧱 Architecture

### Frontend (aligned with StewardPOS)
- **Vite**
- **React 18**
- **TypeScript**
- **React Router**
- **Tailwind CSS**
- **shadcn/ui (Radix UI)**
- **TanStack React Query**
- **React Hook Form + Zod**

### Backend
- **Node.js**
- **Express**
- **PostgreSQL**
- **Prisma ORM**
- **JWT Authentication**
- **Role-Based Access Control (RBAC)**

### Design Principles
- Modular by feature
- Role-first security
- API-driven
- Audit-friendly
- Church-specific accounting

---

## 🗂️ Repository Structure

```text
StewardChMS/
├─ docs/
│  ├─ spec.md              # Source of truth
│  ├─ cursor-rules.md      # AI development guardrails
│  ├─ decisions.md         # Architecture decisions log
│  └─ prompts/             # Phase-by-phase Cursor prompts
├─ src/
│  ├─ client/              # React frontend
│  └─ server/              # API + business logic
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ tests/
└─ README.md

---

## ✝️ A Note on Purpose

StewardChMS was built as an expression of my faith in **the Lord Jesus Christ**.

I believe the Church is called to steward people, time, and resources with integrity, excellence, and love. This project exists to serve that calling by providing tools that help churches care well for their communities and operate with transparency and faithfulness.

> “Moreover it is required in stewards, that a man be found faithful.”  
> — 1 Corinthians 4:2 (KJV)
