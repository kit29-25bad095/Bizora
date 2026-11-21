# ADR-012: STORAGE PROVIDER ABSTRACTION

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Infrastructure Architect  

---

## Context & Problem
Bizora requires cloud object storage for temporary staging of uploaded CSV/Excel spreadsheets (up to 25 MB) and future report exports. Directly coupling domain modules to a specific cloud vendor's SDK (e.g. `@vercel/blob` or AWS `@aws-sdk/client-s3`) creates proprietary vendor lock-in, increases migration friction under ADR 005, and complicates local developer testing.

## Decision
Implement a **Storage Provider Interface (`StorageService`)**:
1. All spreadsheet staging, presigned upload URL generation, and file deletion operations interact exclusively with a domain interface defined in `src/lib/storage/interface.ts`.
2. The implementation is selected via configuration at runtime:
   - `VercelBlobStorageService` (Managed cloud option for Stage A).
   - `S3CompatibleStorageService` (AWS S3, Cloudflare R2, MinIO for Stage B/C and local dev).
3. Raw uploaded spreadsheet files in staging storage are tagged with a 30-day lifecycle expiration rule, guaranteeing automated deletion.

## Alternatives Evaluated
1. **Direct Coupling to AWS S3 SDK:** Rejected. Couples application code to AWS-specific authentication and configuration paradigms.
2. **Direct Coupling to Vercel Blob:** Rejected. Impedes deployment on Google Cloud Run or AWS ECS under Stage B/C.
3. **Database BLOB Storage (Storing files in PostgreSQL):** Rejected. Severely inflates database size, connection bandwidth, and backup times.

## Consequences & Trade-offs
* **Advantages:** Absolute vendor portability, clean separation of concerns, trivial local mocking and automated test execution.
* **Disadvantages:** Introduces a lightweight adapter class wrapping underlying storage SDKs.
* **Revisit Condition:** None. Standard enterprise design pattern.
