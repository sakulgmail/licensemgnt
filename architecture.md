# Architecture

## Overview
A full-stack web app using Node.js and PostgreSQL.

## Components
- **Frontend**: Windsurf auto-generated UI
- **Backend**: Windsurf/Node.js API
- **Database**: PostgreSQL with tables:
  - `users`
  - `customers`
  - `vendors`
  - `contracts`

## Authentication
Simple username/password (no 2FA)

## Notifications
Scheduled daily job to send Gmail alerts when:
- `today + notification_days >= contract.end_date`
