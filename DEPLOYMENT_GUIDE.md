# 🚀 מדריך פריסה ל-Google Cloud Run

## סיכום הבעיה שזוהתה

מהשגיאה שקיבלת, הבעיות העיקריות היו:

1. **GOOGLE_APPLICATION_CREDENTIALS** - הנתיב היה מצביע לקובץ מקומי ב-Windows שלא קיים בקונטיינר
2. **NEXTAUTH_URL** - היה מוגדר כ-placeholder ולא ככתובת האמיתית של השירות
3. **DATABASE_URL** - צריך להיות מוגדר כמשתנה סביבה ב-Cloud Run

## ✅ מה תוקן

### 1. קובץ `.env.production`
- ✅ הסרנו את `GOOGLE_APPLICATION_CREDENTIALS` (Cloud Run משתמש בservice account אוטומטית)
- ✅ עדכנו את המבנה לעבודה עם Cloud Run

### 2. סקריפטים חדשים
נוצרו 2 סקריפטי פריסה:
- ✅ `deploy-cloud-run.sh` - לסביבות Linux/Mac/WSL
- ✅ `deploy-cloud-run.ps1` - ל-Windows PowerShell (מומלץ)

## 📋 שלבי הפריסה

### שלב 1: ודא שאתה מחובר ל-Google Cloud

```powershell
# בדוק חיבור
gcloud auth list

# אם לא מחובר, התחבר
gcloud auth login

# ודא שהפרויקט הנכון מוגדר
gcloud config set project insurance-app-486316
```

### שלב 2: הפעל את סקריפט הפריסה

#### אופציה א' - PowerShell (מומלץ ל-Windows):

```powershell
cd my-agent-app
.\deploy-cloud-run.ps1
```

#### אופציה ב' - Bash/WSL:

```bash
cd my-agent-app
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

### שלב 3: המתן לפריסה
הפריסה תכלול:
1. ✅ הפעלת APIs נדרשים
2. ✅ בניית Docker image (5-10 דקות)
3. ✅ העלאה ל-Container Registry
4. ✅ פריסה ל-Cloud Run
5. ✅ הגדרת משתני סביבה
6. ✅ חיבור ל-Cloud SQL

### שלב 4: בדוק את השירות

אחרי הפריסה המוצלחת, תקבל:
```
✅ Deployment Completed Successfully!
🌐 Service URL: https://insurance-app-XXXXX-uc.a.run.app
```

## 🔧 הגדרות נוספות (אם נדרש)

### הגדרת Service Account Permissions

אם תקבל שגיאות גישה ל-Cloud Storage:

```powershell
# קבל את ה-service account של Cloud Run
$SERVICE_ACCOUNT = (gcloud run services describe insurance-app `
  --region us-central1 `
  --format="value(spec.template.spec.serviceAccountName)")

# תן הרשאות ל-Cloud Storage
gcloud projects add-iam-policy-binding insurance-app-486316 `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/storage.objectAdmin"
```

### עדכון משתני סביבה ידנית (אם נדרש)

```powershell
gcloud run services update insurance-app `
  --region us-central1 `
  --set-env-vars="KEY=VALUE"
```

## 🐛 פתרון בעיות נפוצות

### בעיה 1: "Build failed"

**תסמינים:** הבנייה נכשלת עם שגיאת TypeScript או Prisma

**פתרון:**
```powershell
# בדוק build מקומי
npm run build

# אם יש שגיאות TypeScript, תקן אותן
# אם יש בעיות Prisma:
npx prisma generate
npm run build
```

### בעיה 2: "Database connection failed"

**תסמינים:** השירות עובד אבל לא מצליח להתחבר ל-DB

**פתרון:**
```powershell
# ודא שהוספת Cloud SQL connection
gcloud run services update insurance-app `
  --region us-central1 `
  --add-cloudsql-instances="insurance-app-486316:us-central1:INSTANCE_NAME"
```

### בעיה 3: "Cannot access Cloud Storage"

**תסמינים:** העלאת קבצים נכשלת

**פתרון:**
```powershell
# תן הרשאות לservice account
# ראה "הגדרת Service Account Permissions" למעלה
```

### בעיה 4: "NEXTAUTH_URL mismatch"

**תסמינים:** בעיות authentication/redirect

**פתרון:**
```powershell
# קבל את ה-URL האמיתי
$SERVICE_URL = (gcloud run services describe insurance-app `
  --region us-central1 `
  --format="value(status.url)")

# עדכן NEXTAUTH_URL
gcloud run services update insurance-app `
  --region us-central1 `
  --update-env-vars="NEXTAUTH_URL=$SERVICE_URL"
```

## 📊 בדיקת לוגים

### לוגים של Cloud Run:
```powershell
gcloud run services logs read insurance-app `
  --region us-central1 `
  --limit 50
```

### לוגים של Cloud Build:
```powershell
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

## 🔐 אבטחה - חשוב!

### אחרי הפריסה הראשונה:

1. **שנה את סיסמת Admin:**
   - התחבר כ-admin
   - עבור להגדרות
   - שנה את הסיסמה

2. **הגדר Secrets (מומלץ):**
   במקום לשים סודות כמשתני סביבה, השתמש ב-Secret Manager:

```powershell
# צור secret
echo "your-database-url" | gcloud secrets create database-url --data-file=-

# הרשה ל-Cloud Run לגשת
gcloud secrets add-iam-policy-binding database-url `
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"

# עדכן Cloud Run לשימוש ב-secret
gcloud run services update insurance-app `
  --region us-central1 `
  --update-secrets="DATABASE_URL=database-url:latest"
```

3. **הגבל גישה (אם נדרש):**
```powershell
# אם אתה רוצה authentication
gcloud run services update insurance-app `
  --region us-central1 `
  --no-allow-unauthenticated
```

## 🎯 Checklist לפני הפרזנטציה

- [ ] הפריסה הושלמה בהצלחה
- [ ] השירות נגיש ב-URL
- [ ] התחברות כ-admin עובדת
- [ ] העלאת קבצים עובדת
- [ ] התראות מופיעות
- [ ] Database connection יציב
- [ ] שינית את סיסמת admin (מומלץ)
- [ ] בדקת את כל התכונות העיקריות

## 🔄 עדכונים עתידיים

כשאתה רוצה לפרוס גרסה חדשה:

```powershell
# פשוט הרץ שוב את הסקריפט
cd my-agent-app
.\deploy-cloud-run.ps1
```

הסקריפט יבנה image חדש ויעדכן את השירות אוטומטית.

## 📞 לינקים שימושיים

- **Cloud Run Console:** https://console.cloud.google.com/run?project=insurance-app-486316
- **Cloud SQL Console:** https://console.cloud.google.com/sql?project=insurance-app-486316
- **Cloud Storage Console:** https://console.cloud.google.com/storage/browser/insurance-app-uploads
- **Cloud Build History:** https://console.cloud.google.com/cloud-build/builds?project=insurance-app-486316
- **Logs Explorer:** https://console.cloud.google.com/logs?project=insurance-app-486316

## ⚡ פקודות מהירות

```powershell
# בדוק סטטוס של השירות
gcloud run services describe insurance-app --region us-central1

# קבל URL של השירות
gcloud run services describe insurance-app --region us-central1 --format="value(status.url)"

# צפה בלוגים בזמן אמת
gcloud run services logs tail insurance-app --region us-central1

# עצור את השירות (חסוך כסף)
gcloud run services update insurance-app --region us-central1 --max-instances=0

# הפעל מחדש
gcloud run services update insurance-app --region us-central1 --max-instances=10
```

---

**מוכן לפרוס? הרץ:**
```powershell
cd my-agent-app
.\deploy-cloud-run.ps1
```

**בהצלחה! 🚀**
