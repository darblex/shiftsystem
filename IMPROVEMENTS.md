# ShiftSystem Improvements

## Changes Made

### 1. New API endpoint: `/api/reports` (`src/app/api/reports/route.ts`)
- GET endpoint requiring authentication (any role)
- Returns `shiftsPerEmployee`, `shiftTypeDistribution`, `attendanceSummary`, `topWorkers`
- Accepts `year` and `month` query params (defaults to current month)
- Uses the existing `getDb()` / `db` pattern from `src/lib/db.ts`

### 2. New page: `/reports` (`src/app/reports/page.tsx`)
- Full page with Sidebar component
- Auth check (redirect to `/login` if not authenticated)
- Header with title "דוחות וסטטיסטיקות"
- Month/year selector with prev/next navigation
- 4 summary stat cards (total shifts, employees, top worker, attendance hours)
- "חלוקת משמרות לפי סוג" — horizontal bar chart using pure CSS/Tailwind
- "עובדים לפי כמות משמרות" — ranked list with progress bars
- "נוכחות חודשית" — attendance summary table
- framer-motion animations, RTL Hebrew, dark theme

### 3. New API endpoint: `/api/profile` (`src/app/api/profile/route.ts`)
- GET: returns current user's full profile
- PATCH: allows updating `full_name`, `email`, `phone`, `department`
- POST with `action="change_password"`: validates old password, sets new password (min 8 chars)
- Uses `requireAuth` from `src/lib/auth.ts`

### 4. New page: `/profile` (`src/app/profile/page.tsx`)
- Full profile management page
- Editable form: שם מלא, אימייל, טלפון, מחלקה
- Change password section: סיסמה נוכחית, סיסמה חדשה, אישור סיסמה
- Recent shifts list (current month)
- Toast notifications using `@radix-ui/react-toast`
- Same styling as rest of app

### 5. Updated Sidebar (`src/components/Sidebar.tsx`)
- Added "דוחות" link → `/reports` with `BarChart2` icon (admin/manager only)
- Added "פרופיל" link → `/profile` with `UserCircle` icon (all roles)
- All existing links preserved

### 6. Search/filter in ShiftBoard (`src/components/ShiftBoard.tsx`)
- Added text search input filtering employees by name
- Department dropdown filter was already present; `visibleEmployees` now also filters by search query
- Client-side filtering, no API calls
- Existing functionality fully preserved

### 7. Dashboard improvements (`src/app/dashboard/page.tsx`)
- Added "משמרות הקרובות" widget showing next 7 days of shifts for current user
- Quick action buttons updated: "לוח משמרות" → `/schedule`, "הגש בקשה" → `/schedule?view=requests` (employee only), "עובדים" → `/admin` (admin/manager only)

## Build Status
✅ Build succeeded with exit code 0. All 14 pages compiled, linted, and statically generated successfully.
