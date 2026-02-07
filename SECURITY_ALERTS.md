# 🚨 התראות אבטחה קריטיות - insurance-app

## ⚠️ CRITICAL ALERTS - קרא לפני כל פעולה!

---

## 🔴 ALERT #1: גיבוי לפני כל שינוי

### ❌ לעולם אל תבצע את הפעולות הבאות ללא גיבוי:
- ❌ איפוס מערכת
- ❌ מחיקת משתמשים
- ❌ שינוי מבנה דאטהבייס
- ❌ עדכון גרסה major

### ✅ נוהל גיבוי חובה:
```bash
# גיבוי אוטומטי
./scripts/production-reset.ps1  # יוצר גיבוי אוטומטית

# גיבוי ידני
gcloud sql export sql YOUR_INSTANCE \
  gs://insurance-app-uploads/backups/manual_$(date +%Y%m%d_%H%M%S).sql \
  --database=agent_pro
```

**⏱️ משך זמן:** 2-5 דקות
**📍 מיקום:** Cloud Storage + Local

---

## 🔴 ALERT #2: אימות זהות כפול (2FA)

### ⚠️ משתמשי ADMIN חייבים:
1. ✅ סיסמה חזקה (16+ תווים)
2. ✅ Google Authenticator
3. ✅ גישה רק מ-IP מאושרים
4. ✅ Session timeout: 30 דקות

### 🔒 הגדרות נוכחיות:
- [ ] 2FA מופעל
- [x] סיסמה חזקה
- [ ] IP Whitelist
- [ ] Session Management

**ACTION REQUIRED:** הפעל 2FA לפני פרודקשן!

```typescript
// הוסף ל-NextAuth config
callbacks: {
  async signIn({ user, account }) {
    // בדוק 2FA
    if (user.role === 'ADMIN' && !user.twoFactorEnabled) {
      return '/auth/setup-2fa'
    }
    return true
  }
}
```

---

## 🔴 ALERT #3: Credentials חשופים

### 🚫 אסור להחזיק בפרויקט:
- ❌ קבצי .json עם credentials
- ❌ API keys בקוד
- ❌ סיסמאות ב-.env committed
- ❌ Private keys

### ✅ כרגע:
- ✅ Credentials ב-Desktop (מחוץ לפרויקט)
- ✅ .env ב-.gitignore
- ✅ NEXTAUTH_SECRET חזק
- ⚠️ **אבל:** צריך לעבור ל-Secret Manager!

### 🔧 פתרון קבוע:

```bash
# 1. העלה ל-Secret Manager
echo -n "YOUR_SECRET" | gcloud secrets create nextauth-secret \
  --data-file=- \
  --replication-policy="automatic"

# 2. תן גישה ל-Cloud Run
gcloud secrets add-iam-policy-binding nextauth-secret \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

# 3. עדכן Cloud Run
gcloud run services update YOUR_SERVICE \
  --update-secrets=NEXTAUTH_SECRET=nextauth-secret:latest
```

---

## 🔴 ALERT #4: SQL Injection

### ⚠️ נקודות תורפה:
- Search queries
- User input בפילטרים
- Dynamic SQL queries

### ✅ הגנות קיימות:
```typescript
// Prisma מגן אוטומטית
await prisma.user.findMany({
  where: {
    name: {
      contains: userInput // ✅ Safe - Prisma escapes
    }
  }
})

// ❌ אסור:
await prisma.$queryRaw`SELECT * FROM User WHERE name = ${userInput}`

// ✅ צריך:
await prisma.$queryRaw`SELECT * FROM User WHERE name = ${Prisma.sql`${userInput}`}`
```

---

## 🔴 ALERT #5: XSS (Cross-Site Scripting)

### 🎯 נקודות רגישות:
- File names שמוצגים ללקוח
- Notes שסוכנים כותבים
- User names
- Folder names

### ✅ הגנות:
```typescript
// React escapes אוטומטית
<div>{fileName}</div> // ✅ Safe

// ❌ מסוכן:
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ אם חייב HTML:
import DOMPurify from 'isomorphic-dompurify'
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />
```

---

## 🔴 ALERT #6: File Upload Security

### ⚠️ סיכונים:
- Malware uploads
- Executable files (.exe, .sh, .bat)
- Oversized files (DoS)
- Path traversal

### ✅ אכיפת אבטחה:

```typescript
// הוסף validation ל-upload API
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('File type not allowed')
}

if (file.size > MAX_SIZE) {
  throw new Error('File too large')
}

// Scan למלוור (אם אפשר)
// await scanFileForViruses(file)
```

---

## 🔴 ALERT #7: Rate Limiting

### ⚠️ התקפות אפשריות:
- Brute force על login
- API spam
- DoS attacks

### ✅ הגנות נוכחיות:

בדוק את [src/lib/rate-limiter.ts](src/lib/rate-limiter.ts):

```typescript
// הגבל login attempts
const rateLimiter = new RateLimiter({
  window: 15 * 60 * 1000, // 15 דקות
  max: 5 // 5 ניסיונות
})

// הגבל API calls
const apiLimiter = new RateLimiter({
  window: 60 * 1000, // דקה
  max: 100 // 100 בקשות
})
```

### 🔧 צריך להוסיף:
- [ ] Rate limiting על כל API endpoints
- [ ] IP blocking אחרי ניסיונות כושלים
- [ ] CAPTCHA אחרי 3 כשלונות
- [ ] Alert למנהל על ניסיונות חשודים

---

## 🔴 ALERT #8: HTTPS בלבד

### ✅ Cloud Run:
- ✅ HTTPS אוטומטי
- ✅ TLS 1.3
- ✅ Redirects מ-HTTP ל-HTTPS

### ⚠️ וודא:
```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

---

## 🔴 ALERT #9: Session Security

### ⚠️ בעיות אפשריות:
- Session hijacking
- Session fixation
- Expired sessions לא נמחקות

### ✅ הגדרות מומלצות:

```typescript
// lib/auth.ts
export const authOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // ✅ 30 דקות (לא 30 ימים!)
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,    // ✅ לא נגיש דרך JS
        sameSite: 'lax',   // ✅ הגנת CSRF
        secure: true,      // ✅ רק HTTPS
        path: '/',
      }
    }
  }
}
```

---

## 🔴 ALERT #10: Database Security

### ⚠️ Cloud SQL Hardening:

```bash
# 1. אכוף SSL connections
gcloud sql instances patch YOUR_INSTANCE \
  --require-ssl

# 2. הגבל גישה לIP ספציפי
gcloud sql instances patch YOUR_INSTANCE \
  --authorized-networks="YOUR_OFFICE_IP/32"

# 3. אוטומטי backups
gcloud sql instances patch YOUR_INSTANCE \
  --backup-start-time="03:00" \
  --enable-bin-log

# 4. Point-in-time recovery
gcloud sql instances patch YOUR_INSTANCE \
  --enable-point-in-time-recovery
```

---

## 📊 Security Checklist - לפני Production

### קריטי (חובה):
- [ ] גיבוי אוטומטי מופעל
- [ ] Credentials ב-Secret Manager
- [ ] SSL/TLS מאושר
- [ ] Rate limiting על כל endpoints
- [ ] XSS protection
- [ ] SQL injection protection
- [ ] File upload validation
- [ ] HTTPS בלבד
- [ ] Session timeout 30 דקות
- [ ] Error logging ל-Cloud Logging

### חשוב (מומלץ):
- [ ] 2FA למנהלים
- [ ] IP Whitelist
- [ ] Web Application Firewall (Cloud Armor)
- [ ] DDoS protection
- [ ] Monitoring & Alerts
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] Audit logging
- [ ] Automated vulnerability scanning

### נחמד לקבל (אופציונלי):
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Security training לצוות
- [ ] Incident response plan

---

## 🚨 מה לעשות במקרה חירום

### חשד לפריצה:

1. **מיידי - עצור הכל:**
   ```bash
   # השבת את השירות
   gcloud run services update YOUR_SERVICE --no-allow-unauthenticated
   ```

2. **נעל משתמשים:**
   ```sql
   UPDATE User SET password = 'LOCKED' WHERE role != 'ADMIN';
   ```

3. **צור גיבוי חירום:**
   ```bash
   gcloud sql export sql YOUR_INSTANCE \
     gs://insurance-app-uploads/emergency_backup_$(date +%s).sql \
     --database=agent_pro
   ```

4. **בדוק לוגים:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision" \
     --limit=1000 \
     --format=json > incident_logs.json
   ```

5. **התקשר לאבטחה / צוות DevOps**

---

## 📞 אנשי קשר חירום

- **Google Cloud Support:** https://cloud.google.com/support
- **Security Team:** [הוסף פרטים]
- **DevOps On-Call:** [הוסף פרטים]

---

## 📚 משאבים נוספים

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)

---

## ⚡ זכור:

> **"אבטחה היא לא פיצ'ר - זה תהליך מתמשך!"**

- ✅ סקור אבטחה כל חודש
- ✅ עדכן dependencies שבועית
- ✅ בדוק לוגים יומית
- ✅ גיבוי אוטומטי כל לילה
- ✅ תרגול incident response כל רבעון

---

**תאריך עדכון אחרון:** 2026-02-07
**מאושר ע"י:** DevOps Team
**גרסה:** 1.0
