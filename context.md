# Project Context: Mimora (v2)

**Last Updated:** February 11, 2026
**Version:** 0.2.0

## 1. Project Overview

Mimora is a platform connecting Customers with Beauty Professionals (Artists). The project structure is divided into a Frontend (React+Vite) and a Backend (FastAPI).

### Key Technology Stack

**Frontend (`d:\mimora\Mimora-Forntend-Dev`):**
-   **Framework**: React 19 + Vite 7.2
-   **Language**: TypeScript (~5.9)
-   **Styling**: Tailwind CSS v4, Framer Motion
-   **State**: React Query v5, React Context
-   **Auth**: Custom Auth Service + Firebase Auth (v12) integration

**Backend (`d:\mimora\Mimora-Backend`):**
-   **Framework**: FastAPI
-   **Language**: Python 3.11+
-   **Database**: PostgreSQL + PostGIS (via `geoalchemy2`)
-   **ORM**: SQLAlchemy
-   **Migrations**: Alembic
-   **Auth**: Firebase Admin + JWT (Custom Session Management)
-   **KYC**: Meon Integration

## 2. Directory Structure

### Frontend (`d:\mimora\Mimora-Forntend-Dev\src`)
```
src/
├── components/         # UI Components
│   ├── auth/           # Login/Signup Views (ArtistSignupView, LoginView)
│   ├── home/           # HomePage components (HeroCarousel, ArtistSection, etc.)
│   └── common/         # Shared UI (Loader, Buttons)
├── services/           # API Integration
│   └── authService.ts  # Handles Auth API calls (Login, OTP, KYC)
├── pages/              # Route Pages (HomePage, AuthPage, LandingPage)
├── hooks/              # Custom Hooks (useGeolocation, useAuth)
└── types/              # TypeScript Interfaces
```

### Backend (`d:\mimora\Mimora-Backend\app`)
```
app/
├── auth/
│   ├── models.py       # DB Models (User, Artist, KYCRequest, EmailOTP)
│   ├── database.py     # DB Connection Request
│   ├── routes/         # API Endpoints
│   │   ├── routes.py       # Customer Auth (Login, OTP, OAuth)
│   │   └── artistroute.py  # Artist Auth & KYC (Register, Meon Integration)
│   ├── schemas.py      # Pydantic Models for Validation
│   └── utils/          # Helpers (OTP generation, Email sending)
└── main.py             # FastAPI Entry Point
```

## 3. Data Models (Database Schema)

### User (Customer)
-   **Core**: `id` (UUID), `name`, `email` (unique), `phone_number` (unique)
-   **Auth**: `firebase_uid`, `provider` (google/phone/email)
-   **Location**: `latitude`, `longitude`, `city`, `flat_building`, `street_area`, `landmark`, `pincode`, `state`, `address`, `location` (PostGIS Point)
-   **Prefs**: `travel_radius`

### Artist
-   **Core**: `id` (UUID), `username` (unique), `email`, `phone_number`
-   **Profile**: `bio`, `profession` (Array), `experience`
-   **Location**: `latitude`, `longitude`, `city`, `flat_building`, `street_area`, `landmark`, `pincode`, `state`, `address`, `location` (PostGIS Point)
-   **Verification**:  
    -   `kyc_verified` (Boolean)
    -   `bank_verified` (Boolean)
    -   `kyc_id` (Meon Reference)
-   **Stats**: `rating`, `total_reviews`, `total_bookings`
-   **Portfolio**: `portfolio` (Array of Image URLs)

### KYCRequest
-   **Tracks**: Meon KYC process status.
-   **Fields**: `artist_id`, `provider` (meon), `provider_kyc_id`, `status`, `document_verified`, `face_verified`, `verification_data` (JSON).

## 4. Feature Implementation Status

### ✅ Authentication & Onboarding
-   **Customer Auth**:
    -   Email OTP: implemented (`/auth/customer/email`)
    -   Phone Auth: implemented via Firebase (`/auth/customer/otp`)
    -   Google OAuth: implemented (`/auth/customer/oauth`)
    -   Existence Check: implemented (`/auth/customer/check`)
-   **Artist Auth**:
    -   Registration flow linked to `Artist` model.
    -   Similar OAuth/OTP mechanisms supported.

### 🚧 identity Verification (KYC)
-   **Provider**: Meon
-   **Flow**: 
    1.  **Document Verification**: API `/kyc/start/{artist_id}` initiates Aadhar/PAN check.
    2.  **Face Verification**: API `/kyc/face/{artist_id}` initiates liveness check.
    3.  **Webhook**: `/kyc/webhook` handles callbacks from Meon (`aadhaar`, `pan`, `face`).
-   **Status**: Backend logic implemented. Frontend integration pending.

### 🚧 Home & Discovery
    -   **HomePage**:
    -   UI implemented with `HeroCarousel`, `Categories`, `ArtistSection`.
    -   **Data**: Currently uses hardcoded "Frequently/Recently Booked" data.
    -   **Location**: `LocationDialog` captures user lat/long + full address via **Reverse Geocoding** (Nominatim). **Backend API** (`PUT /auth/customer/location`) updates user location. Navbar location is clickable.
-   **Artist Home**: Dummy dashboard implemented at `/artist` with `LocationDialog` integration.
-   **Search**: `SearchOverlay` UI exists. Backend support for geospatial search exists (`location` column) but search API endpoint needs verification.

### ❌ Booking & Payments
-   Not yet implemented in current backend analysis.

## 5. API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/auth/customer/check` | Check if user exists (phone/email) |
| PUT | `/auth/customer/location` | **[NEW]** Update Customer Location (Full Address) |
| POST | `/auth/customer/oauth` | Google Login/Signup (Full Address) |
| POST | `/auth/customer/otp` | Phone Login/Signup (Full Address) |
| POST | `/auth/customer/email` | Send Email OTP |
| POST | `/auth/customer/email/verify` | Verify Email OTP |
| POST | `/auth/artist/oauth` | **[NEW]** Artist Google Auth (Full Address) |
| POST | `/auth/artist/otp` | **[NEW]** Artist Phone Auth (Full Address) |
| PUT | `/auth/artist/location` | **[NEW]** Update Artist Location (Full Address) |
| POST | `/auth/artist/register` | Create Artist Profile |
| POST | `/kyc/start/{artist_id}` | Initiate Meon Document KYC |
| POST | `/kyc/face/{artist_id}` | Initiate Meon Face KYC |
| GET | `/kyc/status/{artist_id}` | Check Verification Status |

## 6. Maintenance Notes
-   **Migration**: Uses Alembic. One migration script exists (`40d442584966_add_customer_columns.py`).
-   **Env Vars**: Backend requires `MEON_API_KEY`, `MEON_SECRET_KEY`, `FIREBASE_CREDENTIALS`.
