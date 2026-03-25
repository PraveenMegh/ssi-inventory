# SSI Inventory Management System (Local-Run Web App)

This project is a **front-end only** inventory + sales order + dispatch system.

## What it is
- Runs locally in a browser
- Stores data in your browser using **LocalStorage**
- Has role-based screens and **salesperson isolation** logic

## What it is NOT
- Not a server/database app (no MySQL/Postgres)
- No backend authentication—passwords are stored locally (for demo/MVP use)

If you need a production version (multi-device, centralized database, backups, audit logs), we can convert this to a proper backend later.

## Default Login
- Username: `admin`
- Password: `admin123`

## How to run
### Option A (simplest)
Just open `index.html` in Chrome.

### Option B (recommended: local web server)
If you have Python:
```bash
python -m http.server 8000
```
Then open:
- http://localhost:8000

## Roles
- Admin (full access)
- Stock Department
- Dispatch Department
- Salesperson (can only see their own orders)

## Units
- Unit 1: Modinagar
- Unit 2: Patla

## Notes
- Currency dropdown: INR (default), USD, EUR, GBP
- UoM: KG (default) + NOS
- Pack sizes: 100g, 200g, 500g, 1kg, 30kg, 40kg, 50kg

