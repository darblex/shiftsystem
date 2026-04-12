# 🗓️ ShiftSystem — מערכת ניהול משמרות

מערכת ניהול משמרות מלאה בנויה עם Next.js 14, TypeScript ו-SQLite. מתאימה לעסקים קטנים-בינוניים לניהול עובדים, סידורי עבודה ובקשות משמרת.

---

## מה המערכת עושה

ShiftSystem מאפשרת לניהול ולעובדים לנהל את סידורי העבודה במקום אחד:

- **מנהלים** יוצרים ומשבצים משמרות, מאשרים בקשות, ורואים תמונה מלאה של הצוות.
- **עובדים** רואים את המשמרות שלהם, מגישים בקשות חופש/החלפה, ומקבלים עדכונים בזמן אמת.
- כל הנתונים נשמרים מקומית ב-SQLite (ניתן לשדרג ל-PostgreSQL בסביבת ייצור).

---

## פיצ'רים

- 🔐 **אימות JWT** — כניסה מאובטחת עם tokens, תפקידים: admin / employee
- 📅 **לוח משמרות שבועי** — תצוגת לו"ז ויזואלית לפי שבוע
- ✅ **ניהול בקשות** — הגשה ואישור בקשות להחלפת/ביטול משמרת
- 👥 **ניהול עובדים** — CRUD מלא לחשבונות עובדים
- 📊 **דאשבורד ניהולי** — סטטיסטיקות ותצוגה מרוכזת
- 🌙 **Dark mode** — תמיכה מלאה במצב כהה
- 📱 **Responsive** — עובד על מובייל ודסקטופ
- ⚡ **Server Actions** — ללא REST API חיצוני; הכל דרך Next.js

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS + Radix UI + Framer Motion |
| Icons | Lucide React |
| Database | SQLite via better-sqlite3 |
| Auth | jsonwebtoken + bcryptjs |
| Dates | date-fns + date-fns-tz |
| Deploy | Railway / Docker |

---

## התקנה מקומית

### דרישות מקדימות

- Node.js 20+
- npm 9+

### שלבים

```bash
# שכפול המאגר
git clone https://github.com/YOUR_USERNAME/shiftsystem.git
cd shiftsystem

# התקנת תלויות
npm install

# הגדרת משתני סביבה
cp .env.local.example .env.local
# ערוך את הקובץ והגדר JWT_SECRET ו-DATABASE_URL
```

### משתני סביבה (`.env.local`)

```env
# מחרוזת סודית לחתימת JWT — שנה לסוד חזק בייצור!
JWT_SECRET=your-super-secret-key-change-in-production

# נתיב לקובץ SQLite (ניתן גם לחבר PostgreSQL בעתיד)
DATABASE_URL=./data/shiftsystem.db
```

---

## הרצה

```bash
# מצב פיתוח (hot reload)
npm run dev
# האפליקציה תעלה על http://localhost:3000

# בנייה לייצור
npm run build

# הפעלת גרסת ייצור
npm start
```

---

## משתמשי דמו

לאחר הרצה ראשונה, המערכת יוצרת אוטומטית משתמשי ברירת מחדל:

| שם משתמש | סיסמה | תפקיד |
|---|---|---|
| `admin` | `admin123` | מנהל |
| `employee1` | `emp123` | עובד |
| `employee2` | `emp123` | עובד |

> ⚠️ **שנה סיסמאות אלה לפני פריסה לסביבת ייצור!**

---

## Deployment to Railway

### דרישות מקדימות

- חשבון ב-[Railway](https://railway.app)
- Railway CLI מותקן: `npm install -g @railway/cli`
- Git מוגדר עם remote על GitHub

### שלב 1 — Push ל-GitHub

```bash
# אתחול Git (אם לא קיים)
git init
git add .
git commit -m "feat: initial shiftsystem"

# הוספת remote והעלאה
git remote add origin https://github.com/YOUR_USERNAME/shiftsystem.git
git branch -M main
git push -u origin main
```

### שלב 2 — יצירת פרויקט Railway

```bash
# כניסה ל-Railway
railway login

# יצירת פרויקט חדש
railway init

# קישור לפרויקט קיים (אם כבר יצרת דרך הממשק)
railway link
```

### שלב 3 — הגדרת משתני סביבה ב-Railway

דרך ממשק Railway (`Variables` tab) או CLI:

```bash
railway variables set JWT_SECRET=your-super-secret-key-change-in-production
railway variables set DATABASE_URL=/data/shiftsystem.db
railway variables set NODE_ENV=production
```

> 💡 ב-Railway, SQLite ישמר בכרטיס ה-Volume. למאגר נתונים עמיד יותר, חבר PostgreSQL service.

### שלב 4 — פריסה

```bash
# פריסה ידנית
railway up

# או: Railway מגלה אוטומטית את ה-Dockerfile ויפרוס בכל push ל-main
```

Railway יזהה את ה-`Dockerfile` אוטומטית ויבנה את האפליקציה.

---

## מבנה בסיס הנתונים

```
users
  id         INTEGER PRIMARY KEY
  username   TEXT UNIQUE NOT NULL
  password   TEXT NOT NULL          -- bcrypt hash
  role       TEXT NOT NULL          -- 'admin' | 'employee'
  name       TEXT NOT NULL
  email      TEXT
  created_at DATETIME DEFAULT NOW

shifts
  id          INTEGER PRIMARY KEY
  user_id     INTEGER REFERENCES users(id)
  date        TEXT NOT NULL          -- YYYY-MM-DD
  start_time  TEXT NOT NULL          -- HH:MM
  end_time    TEXT NOT NULL          -- HH:MM
  title       TEXT
  notes       TEXT
  created_at  DATETIME DEFAULT NOW

requests
  id          INTEGER PRIMARY KEY
  user_id     INTEGER REFERENCES users(id)
  shift_id    INTEGER REFERENCES shifts(id)
  type        TEXT NOT NULL          -- 'swap' | 'cancel' | 'time_off'
  status      TEXT DEFAULT 'pending' -- 'pending' | 'approved' | 'rejected'
  message     TEXT
  created_at  DATETIME DEFAULT NOW
```

---

## API Overview

כל נקודות הקצה הן **Next.js Route Handlers** תחת `/app/api/`.

### Auth

| Method | Path | תיאור |
|---|---|---|
| `POST` | `/api/auth/login` | כניסה, מחזיר JWT |
| `POST` | `/api/auth/logout` | ניקוי session |
| `GET` | `/api/auth/me` | פרטי המשתמש הנוכחי |

### Users (Admin only)

| Method | Path | תיאור |
|---|---|---|
| `GET` | `/api/users` | רשימת כל העובדים |
| `POST` | `/api/users` | יצירת עובד חדש |
| `PUT` | `/api/users/[id]` | עדכון פרטי עובד |
| `DELETE` | `/api/users/[id]` | מחיקת עובד |

### Shifts

| Method | Path | תיאור |
|---|---|---|
| `GET` | `/api/shifts` | כל המשמרות (ניתן לסנן לפי שבוע/עובד) |
| `POST` | `/api/shifts` | יצירת משמרת חדשה |
| `PUT` | `/api/shifts/[id]` | עדכון משמרת |
| `DELETE` | `/api/shifts/[id]` | מחיקת משמרת |

### Requests

| Method | Path | תיאור |
|---|---|---|
| `GET` | `/api/requests` | רשימת בקשות |
| `POST` | `/api/requests` | הגשת בקשה חדשה |
| `PUT` | `/api/requests/[id]` | אישור / דחיית בקשה (Admin) |

כל הבקשות מוגנות עם JWT bearer token בheader:
```
Authorization: Bearer <token>
```

---

## רישיון

MIT © 2024
