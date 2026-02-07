# 🤖 Monitoring Bot - מערכת ניטור אוטומטית

## מה הבוט עושה?

הבוט רץ **כל 24 שעות** (בשעה 02:00 בלילה) ובודק:

### ✅ בדיקות שמתבצעות:
1. **תקינות האתר** - בודק שהאתר מגיב ופעיל
2. **תקינות מסד הנתונים** - בודק חיבור ל-Cloud SQL
3. **שגיאות במערכת** - בודק logs מ-24 השעות האחרונות
4. **גיבוי אוטומטי** - יוצר גיבוי של מסד הנתונים
5. **ניקוי logs ישנים** - מוחק logs מעל 30 יום

### 📧 מיילים:
- **כל 3 ימים:** מייל סטטוס "המערכת תקינה"
- **מיידי:** מייל התראה אם נמצאה בעיה
- **נשלח ל:** orenshp77@gmail.com

## 🚀 התקנה והפעלה

### התקן את התלויות:
```bash
cd functions/monitoring-bot
npm install
```

### העלה לפרודקשן:
```bash
bash deploy.sh
```

### בדוק ידנית:
```bash
curl https://me-west1-insurance-app-486316.cloudfunctions.net/monitoring-bot
```

## 📊 לוג וניטור

צפה בלוגים של הבוט:
```bash
gcloud functions logs read monitoring-bot --region=me-west1 --limit=50
```

## 🔧 הגדרות

- **תזמון:** כל יום בשעה 02:00 (שעון ישראל)
- **Timeout:** 9 דקות
- **Memory:** 512MB
- **Region:** me-west1 (תל אביב)

## 📦 גיבויים

הגיבויים נשמרים ב:
`gs://insurance-app-backups/backup-YYYY-MM-DDTHH-MM-SS.sql`

השארת **30 גיבויים אחרונים** (חודש לאחור)

## 🔐 אבטחה

- הבוט משתמש בחשבון Gmail: orenshp77@gmail.com
- גישה למסד הנתונים דרך Cloud SQL Proxy
- הגיבויים מוצפנים ב-Google Cloud Storage
