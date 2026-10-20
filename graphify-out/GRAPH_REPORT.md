# Graph Report - shiftsystem  (2026-09-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 635 nodes · 1206 edges · 66 communities (35 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f6db6ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- parsePositiveInt
- index.ts
- auth.ts
- db.ts
- EmployeeList.tsx
- devDependencies
- compilerOptions
- schedule/page.tsx
- ShiftBoard.tsx
- Sidebar.tsx
- attendance/page.tsx
- DutyRoster.tsx
- shiftMeta.ts
- SwapRequests.tsx
- dashboard/page.tsx
- reports/page.tsx
- exportSchedule.ts
- deploy
- duty/page.tsx
- WeekView.tsx
- ConstraintForm.tsx
- DutyCalendar.tsx
- dependencies
- ThemeToggle.tsx
- ProfilePage
- CopyMonthModal.tsx
- layout.tsx
- ChangePasswordPage
- LoginPage
- ShiftEditModal
- bcryptjs
- class-variance-authority
- clsx
- date-fns
- date-fns-tz
- entrypoint.sh
- file-saver
- geist
- jsonwebtoken
- next.config.js
- next-env.d.ts
- jspdf
- jspdf-autotable
- next
- @radix-ui/react-avatar
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-tabs
- @radix-ui/react-toast
- react
- react-dom
- tailwind-merge
- web-push
- xlsx

## God Nodes (most connected - your core abstractions)
1. `parsePositiveInt()` - 36 edges
2. `parseJsonObject()` - 35 edges
3. `normalizeText()` - 27 edges
4. `parseMonth()` - 23 edges
5. `parseYear()` - 23 edges
6. `requireAuth()` - 21 edges
7. `parseIsoDate()` - 20 edges
8. `getUserById()` - 19 edges
9. `compilerOptions` - 17 edges
10. `ShiftType` - 15 edges

## Surprising Connections (you probably didn't know these)
- `getMonthSummary()` --calls--> `getAllShiftsForMonth()`  [EXTRACTED]
  src/lib/schedule.ts → src/lib/db.ts
- `ShiftEntry` --references--> `ShiftType`  [EXTRACTED]
  src/components/ShiftBoard.tsx → src/types/index.ts
- `ShiftEditModalProps` --references--> `ShiftType`  [EXTRACTED]
  src/components/ShiftEditModal.tsx → src/types/index.ts
- `ShiftOption` --references--> `ShiftType`  [EXTRACTED]
  src/components/ShiftEditModal.tsx → src/types/index.ts
- `ShiftEntry` --references--> `ShiftType`  [EXTRACTED]
  src/components/WeekView.tsx → src/types/index.ts

## Import Cycles
- None detected.

## Communities (66 total, 31 thin omitted)

### Community 0 - "parsePositiveInt"
Cohesion: 0.09
Nodes (60): dynamic, GET, POST, DELETE, dynamic, GET, POST, VALID_PREFERENCES (+52 more)

### Community 1 - "index.ts"
Cohesion: 0.07
Nodes (44): dynamic, GET, VALID_TYPES, APRIL_2026_HOLIDAYS, datesInMonth(), dynamic, GET, getDayOfWeek() (+36 more)

### Community 2 - "auth.ts"
Cohesion: 0.10
Nodes (41): DELETE(), dynamic, GET(), PATCH(), POST(), DELETE, dynamic, GET (+33 more)

### Community 3 - "db.ts"
Cohesion: 0.09
Nodes (37): DELETE, dynamic, POST, validEndpoint(), validPushKey(), dynamic, GET(), dynamic (+29 more)

### Community 4 - "EmployeeList.tsx"
Cohesion: 0.06
Nodes (26): AdminPage(), User, Employee, EmployeeList(), setDirection(), toggleSort(), EmployeeListProps, EmployeeRole (+18 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (37): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+29 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+20 more)

### Community 7 - "schedule/page.tsx"
Cohesion: 0.08
Nodes (19): CurrentUser, SchedulePage(), VIEW_BUTTONS, ViewMode, ABSENCE_SHIFTS, DeptEntry, EmployeeSummary, MonthlySummary() (+11 more)

### Community 8 - "ShiftBoard.tsx"
Cohesion: 0.16
Nodes (15): Employee, EmployeeRow, getDayOfWeek(), getDaysInMonth(), HEBREW_WEEKDAYS, HolidayEntry, monthLabel(), nextMonth() (+7 more)

### Community 9 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (13): CurrentUser, SHIFT_LABELS, ShiftEntry, ADMIN_ITEMS, EMPLOYEE_ITEMS, MobileNav(), MobileNavProps, NavItem (+5 more)

### Community 10 - "attendance/page.tsx"
Cohesion: 0.18
Nodes (10): AttendancePage(), ClockCard(), CurrentUser, formatDateHe(), formatDuration(), formatTime(), RecordRow(), todayDate() (+2 more)

### Community 11 - "DutyRoster.tsx"
Cohesion: 0.16
Nodes (11): AddDutyModal(), AddDutyModalProps, DutyAssignment, DutyRoster(), DutyRosterProps, Employee, getDayOfWeek(), getDaysInMonth() (+3 more)

### Community 12 - "shiftMeta.ts"
Cohesion: 0.18
Nodes (12): ShiftEntry, SHIFT_OPTIONS, ShiftEditModalProps, ShiftOption, SHIFT_CLASS, SHIFT_EDIT_ORDER, SHIFT_LABEL, SHIFT_TIME_RANGE (+4 more)

### Community 13 - "SwapRequests.tsx"
Cohesion: 0.14
Nodes (10): SHIFT_ABBREV, DayOffForm(), formatDate(), NewRequestForm(), RequestRow(), SHIFT_TYPES, STATUS_COLOR, STATUS_LABEL (+2 more)

### Community 14 - "dashboard/page.tsx"
Cohesion: 0.20
Nodes (9): CurrentUser, DashboardPage(), Employee, formatIsoDate(), nextMonthParts(), normalizeDutyResponse(), normalizeScheduleResponse(), parseDutyDate() (+1 more)

### Community 15 - "reports/page.tsx"
Cohesion: 0.17
Nodes (7): AttendanceSummary, CurrentUser, ReportsData, ReportsPage(), SHIFT_COLORS, SHIFT_LABELS, ShiftsPerEmployee

### Community 16 - "exportSchedule.ts"
Cohesion: 0.26
Nodes (11): handleExportExcel(), handleExportPDF(), Employee, exportToExcel(), exportToPDF(), getDaysInMonth(), monthLabel(), padDate() (+3 more)

### Community 17 - "deploy"
Cohesion: 0.20
Nodes (9): build, builder, dockerfilePath, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType (+1 more)

### Community 18 - "duty/page.tsx"
Cohesion: 0.24
Nodes (6): CurrentUser, DutyPage(), PushNotificationToggle(), subscribe(), State, urlBase64ToUint8Array()

### Community 19 - "WeekView.tsx"
Cohesion: 0.27
Nodes (7): Employee, getWeekDates(), getWeekOfYear(), HE_DAYS, toIso(), WeekView(), WeekViewProps

### Community 20 - "ConstraintForm.tsx"
Cohesion: 0.22
Nodes (6): ConstraintEntry, ConstraintForm(), ConstraintFormProps, PREF_STYLES, PREFERENCE_OPTIONS, ShiftPreference

### Community 21 - "DutyCalendar.tsx"
Cohesion: 0.29
Nodes (6): DutyCalendar(), DutyCalendarProps, DutyDay, HEBREW_DAYS_SHORT, HEBREW_MONTHS, isWeekend()

### Community 22 - "dependencies"
Cohesion: 0.29
Nodes (7): better-sqlite3, framer-motion, lucide-react, dependencies, better-sqlite3, framer-motion, lucide-react

### Community 23 - "ThemeToggle.tsx"
Cohesion: 0.43
Nodes (5): ThemeToggle(), ThemeToggleProps, getInitialTheme(), Theme, useTheme()

### Community 24 - "ProfilePage"
Cohesion: 0.60
Nodes (4): ProfilePage(), handleChangePassword(), handleSaveProfile(), showToast()

### Community 25 - "CopyMonthModal.tsx"
Cohesion: 0.50
Nodes (3): CopyMonthModal(), CopyMonthModalProps, monthName()

## Knowledge Gaps
- **216 isolated node(s):** `ShiftDayStat`, `ShiftSummary`, `JwtPayload`, `Role`, `CurrentUser` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Sidebar()` connect `Sidebar.tsx` to `EmployeeList.tsx`, `schedule/page.tsx`, `attendance/page.tsx`, `dashboard/page.tsx`, `reports/page.tsx`, `duty/page.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `bcryptjs`, `class-variance-authority`, `clsx`, `date-fns`, `date-fns-tz`, `file-saver`, `geist`, `jsonwebtoken`, `jspdf`, `jspdf-autotable`, `next`, `@radix-ui/react-avatar`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`, `react`, `react-dom`, `tailwind-merge`, `web-push`, `xlsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `ShiftType` connect `shiftMeta.ts` to `parsePositiveInt`, `index.ts`, `db.ts`, `ShiftBoard.tsx`, `SwapRequests.tsx`, `WeekView.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `ShiftDayStat`, `ShiftSummary`, `JwtPayload` to the rest of the system?**
  _216 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `parsePositiveInt` be split into smaller, more focused modules?**
  _Cohesion score 0.09109730848861283 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07020408163265306 - nodes in this community are weakly interconnected._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09840425531914894 - nodes in this community are weakly interconnected._