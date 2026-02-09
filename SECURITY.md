# מדריך אבטחת מידע - הוראות קריטיות לפרודקשן

## 🔴 דרישות קריטיות - חובה לביצוע לפני הפצה!

### 1. ניהול סודות ומפתחות

#### ⚠️ אסור להשאיר סיסמאות בקבצי .env בשרת!

**הבעיה הנוכחית:**
- קבצי `.env` ו-`.env.production` מכילים סיסמאות בטקסט פשוט
- כל מי שיכול לגשת לשרת יכול לקרוא את הסיסמאות
- זה מהווה סיכון אבטחה קריטי!

**הפתרון - שימוש ב-Google Cloud Secret Manager:**

```bash
# 1. התקן את ה-CLI של Google Cloud
gcloud components install

# 2. צור סודות ב-Secret Manager במקום .env
gcloud secrets create DATABASE_PASSWORD --data-file=- <<< "הסיסמה שלך"
gcloud secrets create NEXTAUTH_SECRET --data-file=- <<< "v8KgJbvxr7H7MjbcMFoqaykgHUcOIKalPc+G3+EvAfA="
gcloud secrets create GMAIL_APP_PASSWORD --data-file=- <<< "omegoytwqxuzdoid"

# 3. הגדר את Cloud Run לגשת לסודות
gcloud run deploy insurance-app \
  --update-secrets=DATABASE_PASSWORD=DATABASE_PASSWORD:latest,\
NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,\
GMAIL_APP_PASSWORD=GMAIL_APP_PASSWORD:latest
```

**שינוי בקוד לקריאת סודות:**
```typescript
// במקום process.env.DATABASE_PASSWORD ישירות
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const client = new SecretManagerServiceClient()

async function getSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/YOUR_PROJECT_ID/secrets/${name}/versions/latest`,
  })
  return version.payload?.data?.toString() || ''
}
```

---

### 2. החלף את חשבון Gmail אישי לשירות מייל מקצועי

**הבעיה:**
- שימוש ב-`orenshp77@gmail.com` לא מקצועי ולא מאובטח
- Gmail מגביל לשליחת 500 מיילים ביום
- אין ניהול תורים ומעקב

**הפתרון - השתמש ב-SendGrid או Mailgun:**

```bash
# התקן SendGrid
npm install @sendgrid/mail

# קבל API Key מ-SendGrid: https://app.sendgrid.com/settings/api_keys
# הוסף כ-Secret ב-Google Cloud Secret Manager
gcloud secrets create SENDGRID_API_KEY --data-file=- <<< "SG.xxxxx"
```

**עדכן את הקוד:**
```typescript
// src/lib/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail({ to, subject, html }: EmailOptions) {
  await sgMail.send({
    to,
    from: 'noreply@yourdomain.com', // דומיין מאומת
    subject,
    html,
  })
}
```

---

### 3. הגדר את Google Cloud Storage כפרטי (לא פומבי)

**הבעיה הנוכחית:**
- כל הקבצים פומביים - כל אחד יכול לגשת!
- מידע רגיש של לקוחות חשוף באינטרנט

**הפתרון - כבר תוקן בקוד, אבל חובה לעדכן את ה-Bucket:**

```bash
# 1. הסר גישה פומבית מה-bucket
gsutil iam ch -d allUsers:objectViewer gs://insurance-app-uploads

# 2. הגדר Uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://insurance-app-uploads

# 3. תן גישה רק ל-service account של Cloud Run
gsutil iam ch serviceAccount:YOUR-SERVICE-ACCOUNT@PROJECT.iam.gserviceaccount.com:objectAdmin gs://insurance-app-uploads
```

**עדכון Frontend לשימוש ב-Signed URLs:**
```typescript
// במקום להציג את ה-URL ישירות:
<img src={file.url} /> // ❌ לא יעבד יותר

// השתמש ב-API לקבלת Signed URL:
const response = await fetch('/api/files/signed-url', {
  method: 'POST',
  body: JSON.stringify({ fileId: file.id }),
})
const { url } = await response.json()
// url תקף ל-1 שעה בלבד
<img src={url} /> // ✅ מאובטח
```

---

### 4. החלף סיסמאות קיימות במערכת

**חובה מיידית:**
1. החלף את `NEXTAUTH_SECRET` - צור אחד חדש:
```bash
openssl rand -base64 32
```

2. שנה את סיסמת מסד הנתונים:
```bash
# התחבר ל-Cloud SQL
gcloud sql connect YOUR-INSTANCE --user=root

# שנה סיסמה
ALTER USER 'root'@'%' IDENTIFIED BY 'NEW_STRONG_PASSWORD_HERE';
```

3. החלף את Gmail App Password אם עובר ל-SendGrid

4. **חובה**: אלץ את כל המשתמשים לשנות סיסמאות (עכשיו 12+ תווים חזקים)

---

### 5. הגדר HTTPS Redirect בכל מקום

**ב-Cloud Run:**
```bash
# Cloud Run אוטומטית מספק HTTPS, אבל תוודא שאין גישה ל-HTTP:
gcloud run services update insurance-app --ingress=all --allow-unauthenticated
```

**ב-Load Balancer (אם משתמש):**
- הגדר HTTPS redirect ב-Load Balancer settings
- השתמש ב-Google-managed SSL certificate

---

### 6. הגדר Database Connection Pooling

**הבעיה:**
- כרגע מתחבר ישירות למסד נתונים
- יכול להתמוטט בעומס גבוה

**הפתרון:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")

  // הוסף connection pooling
  relationMode = "prisma"
}

// DATABASE_URL צריך להיות עם connection limits:
// mysql://user:pass@host:3306/db?connection_limit=10&pool_timeout=10
```

---

### 7. הפעל Cloud SQL Proxy בפרודקשן

במקום חיבור ישיר לכתובת IP:

```yaml
# cloudbuild.yaml או Cloud Run settings
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'insurance-app'
    - '--add-cloudsql-instances=PROJECT:REGION:INSTANCE'
    - '--set-env-vars=DATABASE_URL=mysql://root:PASSWORD@localhost:3306/agent_pro?socket=/cloudsql/PROJECT:REGION:INSTANCE'
```

---

### 8. הגדר Cloud Armor (WAF)

```bash
# יצירת security policy
gcloud compute security-policies create insurance-app-policy \
    --description "WAF for insurance app"

# חסום IP ידועים כמזיקים
gcloud compute security-policies rules create 1000 \
    --security-policy=insurance-app-policy \
    --expression="origin.region_code == 'CN' || origin.region_code == 'RU'" \
    --action=deny-403

# הגבל rate (1000 requests per minute per IP)
gcloud compute security-policies rules create 2000 \
    --security-policy=insurance-app-policy \
    --expression="true" \
    --action=rate-based-ban \
    --rate-limit-threshold-count=1000 \
    --rate-limit-threshold-interval-sec=60
```

---

### 9. הגדר Logging ו-Monitoring

```bash
# הפעל Cloud Logging
gcloud logging write insurance-app-logs "Application started" --severity=INFO

# צור alerts
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate" \
    --condition-display-name="Error rate > 5%" \
    --condition-threshold-value=0.05
```

---

### 10. Checklist לפני Deploy לפרודקשן

- [ ] כל הסודות ב-Secret Manager (לא בקבצי .env)
- [ ] GCS Bucket פרטי עם Signed URLs
- [ ] HTTPS בלבד (redirect מ-HTTP)
- [ ] Security headers (CSP, HSTS, וכו') - כבר תוקן ✓
- [ ] מדיניות סיסמאות חזקה (12+ תווים) - כבר תוקן ✓
- [ ] Rate limiting עובד (Cloud Armor או middleware)
- [ ] Cloud SQL Proxy מוגדר
- [ ] Backup אוטומטי של מסד הנתונים
- [ ] Monitoring ו-alerts מוגדרים
- [ ] SendGrid/Mailgun מוגדר (לא Gmail)
- [ ] כל המשתמשים שינו סיסמאות

---

## 📞 תמיכה

אם יש שאלות או בעיות באבטחה:
1. עיין ב-[OWASP Top 10](https://owasp.org/Top10/)
2. בדוק את [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
3. צור issue ב-GitHub

---

## 🔄 עדכונים

תאריך: 2026-02-08
גרסה: 1.0

**שינויים אחרונים:**
- הוספת Signed URLs ל-GCS
- חיזוק מדיניות סיסמאות ל-12+ תווים
- הוספת כותרות אבטחה (CSP, HSTS, X-Frame-Options)
- הגבלת remote image patterns
- הוספת Zod לאימות קלט
