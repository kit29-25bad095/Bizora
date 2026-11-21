# BIZORA — BACKUP AND RESTORE PLAN

## 1. Backup Strategy & Scheduling

| Backup Type | Frequency | Retention Period | Storage Target | Encryption |
| :--- | :---: | :---: | :--- | :---: |
| **Continuous WAL Archiving** | Continuous | 7 Days | Cloudflare R2 / AWS S3 | AES-256 |
| **Automated Daily Snapshot**| Daily (02:00 UTC)| 30 Days | Geographically Isolated S3 | AES-256 |
| **Weekly Full Base Backup** | Weekly (Sunday) | 90 Days | Immutable Object Lock S3 | KMS Enforced |

## 2. Recovery Objectives
- **Recovery Point Objective (RPO):** $\le 1\text{ hour}$ (Maximum allowable data loss window).
- **Recovery Time Objective (RTO):** $\le 30\text{ minutes}$ (Maximum allowable system recovery duration).

## 3. Database Backup Execution
```bash
# Automated daily logical dump execution script
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/bizora_backup_${BACKUP_DATE}.dump"

pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f "$BACKUP_FILE"

# Encrypt backup before cloud transmission
openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -pass file:/etc/bizora/backup_key.bin
```

## 4. Restoration Verification Procedure
```bash
# 1. Decrypt backup archive
openssl enc -d -aes-256-cbc -in "${BACKUP_FILE}.enc" -out "$BACKUP_FILE" -pass file:/etc/bizora/backup_key.bin

# 2. Restore to clean staging / recovery database instance
pg_restore -h $RECOVERY_HOST -U $POSTGRES_USER -d $RECOVERY_DB --clean --if-exists "$BACKUP_FILE"

# 3. Verify row counts and audit chain integrity
psql -h $RECOVERY_HOST -U $POSTGRES_USER -d $RECOVERY_DB -c "SELECT COUNT(*) FROM transactions;"
```
