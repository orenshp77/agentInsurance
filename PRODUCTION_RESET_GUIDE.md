# 🔧 מדריך איפוס מערכת פרודקשן - insurance-app

מדריך זה מסביר כיצד לאפס את מערכת הפרודקשן, לבצע גיבוי מלא, ובדיקת אבטחה לפני הפרזנטציה.

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [דרישות מקדימות](#דרישות-מקדימות)
3. [שיטה 1: סקריפט אוטומטי (מומלץ)](#שיטה-1-סקריפט-אוטומטי-מומלץ)
4. [שיטה 2: API Endpoint](#שיטה-2-api-endpoint)
5. [שיטה 3: ידני דרך Google Cloud Console](#שיטה-3-ידני-דרך-google-cloud-console)
6. [בדיקת אבטחה](#בדיקת-אבטחה)
7. [שחזור מגיבוי](#שחזור-מגיבוי)

---

## סקירה כללית

### מה הסקריפט עושה?

1. ✅ **גיבוי מלא** של הדאטהבייס (Cloud + Local)
2. ✅ **בדיקת אבטחה** מקיפה
3. ✅ **איפוס נתונים**:
   - מחיקת כל הקבצים
   - מחיקת כל התיקיות
   - מחיקת כל ההתראות
   - מחיקת כל הפעילויות
   - מחיקת כל הלוגים
   - מחיקת כל הסוכנים והלקוחות
4. ✅ **שמירה על משתמש Admin** עם פרטי התחברות:
   - Email: `admin@agentpro.com`
   - Password: `admin123`

---

## דרישות מקדימות

### תוכנות נדרשות:

- ✅ **Google Cloud SDK** ([הורדה](https://cloud.google.com/sdk/docs/install))
- ✅ **Git Bash** (ל-Windows) או Terminal (Mac/Linux)
- ✅ **PowerShell** (אופציונלי, ל-Windows)

### אימות Google Cloud:

```bash
# התחברות ל-Google Cloud
gcloud auth login

# הגדרת הפרויקט
gcloud config set project insurance-app-486316

# בדיקת גישה
gcloud sql instances list
```

---

## שיטה 1: סקריפט אוטומטי (מומלץ)

### אופציה A: PowerShell (Windows)

1. פתח **PowerShell** כמנהל מערכת
2. נווט לתיקיית הפרויקט:
   ```powershell
   cd C:\Users\computer\Desktop\agent-pro\my-agent-app
   ```
3. הרץ את הסקריפט:
   ```powershell
   .\scripts\production-reset.ps1
   ```
4. אשר את הפעולה כאשר תתבקש

### אופציה B: Bash (Git Bash / Linux / Mac)

1. פתח **Git Bash** או Terminal
2. נווט לתיקיית הפרויקט:
   ```bash
   cd /c/Users/computer/Desktop/agent-pro/my-agent-app
   ```
3. הפוך את הסקריפט לניתן להרצה:
   ```bash
   chmod +x scripts/production-reset.sh
   ```
4. הרץ את הסקריפט:
   ```bash
   ./scripts/production-reset.sh
   ```
5. אשר את הפעולה כאשר תתבקש

### מה קורה אחרי הרצת הסקריפט?

```
════════════════════════════════════════════════════════
  ✅ Production Reset Completed Successfully!
════════════════════════════════════════════════════════

📦 Backup Location:
   - Cloud: gs://insurance-app-uploads/backups/db_backup_YYYYMMDD_HHMMSS.sql
   - Local: ./backups/YYYYMMDD_HHMMSS/

🔐 Admin Login:
   - Email: admin@agentpro.com
   - Password: admin123

🌐 Service URL:
   - https://your-service-xxxxx.run.app

📋 Security Audit:
   - Report: ./backups/YYYYMMDD_HHMMSS/security_audit.txt
```

---

## שיטה 2: API Endpoint

### שלב 1: בדיקת מצב נוכחי

```bash
# קבל פרטים על מה שימחק
curl -X GET https://your-service.run.app/api/admin/reset-system \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

תקבל תשובה:
```json
{
  "currentStats": {
    "users": { "total": 15, "admins": 1, "agents": 5, "clients": 9 },
    "folders": 25,
    "files": 100
  },
  "willDelete": {
    "agents": 5,
    "clients": 9,
    "folders": 25,
    "files": 100
  },
  "willKeep": {
    "admins": 1
  },
  "warning": "This operation cannot be undone. Make sure you have a backup!"
}
```

### שלב 2: ביצוע איפוס

```bash
# אפס את המערכת
curl -X POST https://your-service.run.app/api/admin/reset-system \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"confirm": "RESET_PRODUCTION_DATA"}'
```

### שלב 3: קבלת Session Cookie

1. התחבר כ-Admin בדפדפן
2. פתח Developer Tools (F12)
3. לך ל-Application → Cookies
4. העתק את ה-cookie בשם `next-auth.session-token`

---

## שיטה 3: ידני דרך Google Cloud Console

### שלב 1: גיבוי דאטהבייס

1. פתח [Google Cloud Console](https://console.cloud.google.com)
2. נווט ל-**SQL** → בחר את ה-instance
3. לחץ על **Export**
4. בחר:
   - Format: **SQL**
   - Database: `agent_pro`
   - Destination: `gs://insurance-app-uploads/backups/manual_backup_YYYYMMDD.sql`

### שלב 2: התחברות ל-Cloud SQL

```bash
# התחבר לדאטהבייס
gcloud sql connect YOUR_INSTANCE_NAME --user=root
```

### שלב 3: הרץ פקודות SQL

```sql
USE agent_pro;

-- מחק את כל הנתונים
DELETE FROM File;
DELETE FROM Folder;
DELETE FROM Notification;
DELETE FROM Activity;
DELETE FROM Log;
DELETE FROM User WHERE role IN ('AGENT', 'CLIENT');

-- בדוק מה נשאר
SELECT email, role, name FROM User;
```

---

## בדיקת אבטחה

### ✅ נושאים שתוקנו:

1. **Google Cloud Credentials**
   - ✅ הקובץ הועבר ל-Desktop (מחוץ לפרויקט)
   - ✅ לא מעוקב ב-git
   - ✅ הנתיב עודכן ב-.env

2. **NEXTAUTH_SECRET**
   - ✅ סוד חזק נוצר
   - ✅ שונה מברירת המחדל

3. **Environment Variables**
   - ✅ קובץ .env ב-.gitignore
   - ✅ אישורי גישה לא חשופים

### ⚠️ המלצות נוספות:

1. **השתמש ב-Google Secret Manager** לסודות בפרודקשן
2. **הפעל Cloud SQL SSL/TLS**
3. **הגדר VPC** בין Cloud Run ל-Cloud SQL
4. **הפעל Cloud Armor** להגנת DDoS
5. **הגדר ניטור ואזעקות**
6. **הפעל גיבויים אוטומטיים** ל-Cloud SQL
7. **הגדר התראות אבטחה**

### בדיקת אבטחה אוטומטית:

לאחר הרצת הסקריפט, תמצא דוח אבטחה ב:
```
./backups/YYYYMMDD_HHMMSS/security_audit.txt
```

---

## שחזור מגיבוי

### במקרה שצריך לשחזר את הנתונים:

#### מ-Cloud Storage:

```bash
# רשימת גיבויים
gsutil ls gs://insurance-app-uploads/backups/

# שחזר גיבוי
gcloud sql import sql YOUR_INSTANCE_NAME \
  gs://insurance-app-uploads/backups/db_backup_YYYYMMDD_HHMMSS.sql \
  --database=agent_pro
```

#### מקובץ מקומי:

```bash
# העלה את הגיבוי ל-Cloud Storage
gsutil cp ./backups/YYYYMMDD_HHMMSS/database_backup.sql \
  gs://insurance-app-uploads/backups/restore.sql

# שחזר
gcloud sql import sql YOUR_INSTANCE_NAME \
  gs://insurance-app-uploads/backups/restore.sql \
  --database=agent_pro
```

---

## 📞 תמיכה

אם נתקלת בבעיות:

1. **בדוק שאתה מחובר ל-Google Cloud**:
   ```bash
   gcloud auth list
   ```

2. **בדוק שהפרויקט מוגדר נכון**:
   ```bash
   gcloud config get-value project
   ```

3. **בדוק את הלוגים**:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision" --limit 50
   ```

---

## 🎯 הכנה לפרזנטציה - רשימת בדיקות

- [ ] **גיבוי הושלם בהצלחה**
- [ ] **המערכת אופסה (אין סוכנים/לקוחות)**
- [ ] **התחברות כ-Admin עובדת**
- [ ] **האפליקציה עולה ללא שגיאות**
- [ ] **דוח אבטחה נבדק**
- [ ] **יצירת סוכן חדש עובדת**
- [ ] **יצירת לקוח עובדת**
- [ ] **העלאת קבצים עובדת**
- [ ] **התראות עובדות**
- [ ] **Dashboard מציג נתונים נכון**

---

## 📚 קבצים רלוונטיים

- **סקריפט PowerShell**: `scripts/production-reset.ps1`
- **סקריפט Bash**: `scripts/production-reset.sh`
- **API Endpoint**: `/api/admin/reset-system`
- **סקריפט Prisma**: `prisma/reset.ts`
- **מדריך זה**: `PRODUCTION_RESET_GUIDE.md`

---

## ⚠️ אזהרות חשובות

1. **האיפוס הוא בלתי הפיך** - וודא שיש לך גיבוי!
2. **זמן השבתה** - המערכת תהיה לא זמינה במהלך האיפוס (כמה דקות)
3. **גישת Admin בלבד** - רק משתמשי ADMIN יכולים להריץ איפוס
4. **בדוק לפני הפרזנטציה** - הרץ את האיפוס לפחות יום לפני!

---

## ✨ בהצלחה בפרזנטציה! 🎉

אם הכל הלך כשורה, המערכת שלך עכשיו נקייה ומוכנה להצגה מקצועית.

**פרטי התחברות:**
- Email: `admin@agentpro.com`
- Password: `admin123`

**זכור לשנות את הסיסמה לאחר הפרזנטציה!**
