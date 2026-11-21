# **Final Antigravity development blueprint**

Production target

Multi-server

Architecture-led

Your engineering direction is now established:

| Decision           | Final requirement                           |
| ------------------ | ------------------------------------------- |
| Development target | Professional production-ready               |
| Infrastructure     | Multiple servers                            |
| Architecture       | Selected through technical assessment       |
| Development method | AI-assisted / Vibe Coding                   |
| Code quality       | Professional software engineering standards |
| Security           | Security-by-design                          |
| Scalability        | Horizontal scaling                          |
| Deployment         | Automated CI/CD                             |
| Reliability        | Monitoring, backup and disaster recovery    |
| Maintainability    | Modular, documented and testable code       |

## **1. Architecture decision**

I recommend that Antigravity evaluate three architectural approaches before selecting one.

**A. Modular monolith**

Preferred starting architecture

One deployable application with independently organized modules, clear boundaries and shared infrastructure.

Best when the product is still evolving and modules do not require independent deployment.

**B. Microservices**

Use when justified

Independently deployed services with explicit API and event contracts.

Useful when separate teams, workloads or scaling requirements justify distributed complexity.

**C. Hybrid architecture**

Future evolution

A modular core application with selected independent services for specific workloads.

Useful when certain components genuinely need independent scaling or deployment.

**My architectural recommendation:** Start with a modular monolith unless the repository assessment demonstrates a genuine need for another architecture. Design module boundaries so that independent services can be extracted later without rewriting the entire application.

## **2. Target production infrastructure**

Your application must be designed to operate across multiple application servers.

[インフラ環境・サポート | OMO/オムニチャネルを実現するECサイト構築パッケージ EC-ORANGE](https://images.openai.com/static-rsc-4/9NU6FI6fHZvjqpCGpV9fA53T561z1HdNbjYlBRSzkB_OTUJdXGJPx2OLvLbPpIxXeNeKWcv_ay9VliLaJtnuG1XqGmhzVD7J0vxywBADa6cINjobpTw2-ah3mOs1Qpli_IFosdSVS7lM247SzR0UyzvNRiF2sRy60s-6nqv-Qjc?purpose=inline)

[ec-orange.jp](https://ec-orange.jp/advantage/infra.html?utm_source=chatgpt.com)

The infrastructure should support:

- Load balancer distributing requests between application instances.
- At least two application instances for production high availability, where the hosting environment supports it.
- Shared database infrastructure with suitable replication and failover.
- Shared cache and session infrastructure.
- Independent background job workers.
- Centralized file and object storage.
- Centralized monitoring and logging.
- Automated deployment and rollback.
- Infrastructure configuration that is portable between supported hosting providers.

Do not confuse multi-server support with multi-cloud or multi-region deployment. Those are separate capabilities and should be introduced only when the availability, recovery or geographic requirements justify them.

# **3. Ordered implementation requirements**

This is the execution order Antigravity must follow. It must not skip phases simply because AI can generate code quickly.

## **Implementation roadmap**

17 phases · Each phase requires verification before progression.

### **01**

**Repository discovery**

Inspect existing source code, Git history, dependencies, configuration and current functionality.

### **02**

**Requirements engineering**

Establish PRD, SRS, user stories, workflows, business rules and acceptance criteria.

### **03**

**Architecture assessment**

Compare modular monolith, microservices and hybrid architectures. Document the decision.

### **04**

**Technology and infrastructure selection**

Select frameworks, database, cache, queue, hosting and infrastructure based on requirements.

### **05**

**System and data design**

Define modules, data models, relationships, API contracts, security boundaries and integration flows.

### **06**

**Repository engineering**

Establish folder structure, coding conventions, dependency rules, Git strategy and development environments.

### **07**

**Infrastructure foundation**

Set up Docker, environment configuration, networking, infrastructure as code and CI pipelines.

### **08**

**Security foundation**

Implement identity, authorization, secrets management, validation, encryption and audit controls.

### **09**

**Database implementation**

Implement schemas, migrations, indexes, constraints, transactions and backup mechanisms.

### **10**

**Backend implementation**

Build business logic, services, API endpoints, background jobs and integrations.

### **11**

**Frontend implementation**

Build reusable UI components, pages, state management and accessible responsive interfaces.

### **12**

**System integration**

Integrate all modules and validate complete business workflows.

### **13**

**Quality assurance**

Perform unit, integration, API, end-to-end, regression and security testing.

### **14**

**Performance and scalability**

Conduct load, stress and concurrency tests; optimize database, caching and application performance.

### **15**

**Multi-server validation**

Test multiple instances, load balancing, shared state, failover, distributed jobs and recovery.

### **16**

**Production release**

Complete security review, deployment verification, rollback testing and production acceptance.

### **17**

**Operations and maintenance**

Monitor, patch, audit, restore, document and evolve the application continuously.

# **4. Master Antigravity instruction**

This is the master prompt I recommend placing into Antigravity before starting or continuing implementation.

# MASTER PROJECT DIRECTIVE

## Production-Grade Software Engineering & Multi-Server Architecture

### ROLE

Act as a principal software architect, senior full-stack engineer, application security engineer, database architect, infrastructure engineer, DevOps engineer and QA lead.

You are responsible for engineering this project to professional production standards.

AI-assisted development must never reduce software quality, security, architectural discipline or reliability.

The objective is to deliver software with the engineering quality expected from an experienced professional development team.

---

# PART 1 — ENGINEERING OBJECTIVES

The application must achieve:

1. Production-ready architecture.
2. Secure-by-design implementation.
3. Maintainable and modular codebase.
4. Multi-server deployment support.
5. Horizontal scalability.
6. High availability appropriate to business requirements.
7. Database consistency and reliability.
8. Automated testing and quality assurance.
9. CI/CD and controlled deployments.
10. Monitoring, logging and observability.
11. Backup and disaster recovery.
12. Complete technical documentation.
13. Portability across supported infrastructure providers.
14. Future extensibility without unnecessary rewrites.

Do not optimize for the fastest code generation.

Optimize for correctness, maintainability, security and long-term ownership.

# PART 2 — PHASE 1: COMPLETE REPOSITORY DISCOVERY

Before writing or modifying code:

- Inspect the entire repository.
- Inspect all existing application modules.
- Review Git history and current branch.
- Identify programming languages and frameworks.
- Inspect dependencies and package versions.
- Review database structure and existing migrations.
- Inspect API endpoints and integrations.
- Inspect environment variables and configurations without exposing secrets.
- Identify existing tests.
- Identify deployment configurations.
- Identify security weaknesses.
- Identify incomplete or duplicated implementations.

Do not assume the repository is empty.

Do not replace existing working functionality without technical justification.

Produce an existing-system assessment.

# PART 3 — PHASE 2: REQUIREMENTS ENGINEERING

Establish:

- Product requirements.
- Functional requirements.
- Non-functional requirements.
- User roles and permissions.
- Business rules.
- Data requirements.
- Performance requirements.
- Security requirements.
- Availability requirements.
- Scalability requirements.
- Integration requirements.
- Regulatory and privacy requirements where applicable.
- Acceptance criteria for every major feature.

Each requirement must have a unique identifier and verification method.

# PART 4 — PHASE 3: ARCHITECTURE SELECTION

Evaluate:

A. Modular monolith.\
B. Microservices.\
C. Hybrid architecture.

Compare the alternatives based on:

- Current project complexity.
- Team size and ownership.
- Module independence.
- Deployment requirements.
- Expected traffic.
- Scaling characteristics.
- Data consistency.
- Operational complexity.
- Security boundaries.
- Long-term maintenance costs.

Select the architecture with the strongest technical justification.

Do not automatically select microservices.

Document the decision in an Architecture Decision Record (ADR).

Produce:

- System architecture diagram.
- Component diagram.
- Module dependency diagram.
- Deployment architecture diagram.
- Data flow diagram.
- Trust boundary diagram.

# PART 5 — PHASE 4: MULTI-SERVER ARCHITECTURE

Design the application for multiple application instances.

Evaluate and implement appropriate support for:

- Reverse proxy and load balancing.
- Stateless application servers.
- Shared session management.
- Shared database infrastructure.
- Database connection pooling.
- Database replication and failover.
- Shared distributed caching.
- Distributed locking when necessary.
- Background job queues.
- Idempotent job processing.
- Shared object storage.
- Health checks and readiness checks.
- Graceful shutdown.
- Horizontal scaling.
- Rolling or blue-green deployment.
- Centralized logging.
- Distributed tracing.
- Automatic instance recovery.

Application servers must not depend on local memory or local disk for persistent shared application state.

Test that a user can access the application through different application instances without session or data inconsistency.

Document infrastructure limitations and single points of failure.

Do not claim high availability unless it has been tested.

# PART 6 — PHASE 5: SECURITY ENGINEERING

Apply security throughout the development lifecycle.

Implement and verify:

- Authentication.
- Role-based access control.
- Resource-level authorization.
- Least-privilege permissions.
- Secure password hashing.
- Secure session management.
- MFA where appropriate.
- TLS.
- Encryption at rest.
- Secrets management.
- API input validation.
- Output encoding.
- Rate limiting.
- CSRF protection where applicable.
- CORS restrictions.
- Secure HTTP headers.
- SQL injection protection.
- XSS protection.
- SSRF protection.
- Secure file uploads.
- Audit logging.
- Dependency vulnerability scanning.
- Container security scanning.
- Security configuration reviews.
- Threat modelling.

Use OWASP ASVS as an application security verification reference and assess relevant OWASP Top 10 risks.

Never commit production secrets or credentials to Git.

Never expose sensitive information in client-side code or logs.

# PART 7 — PHASE 6: DATABASE ENGINEERING

Design the database before implementing business logic.

Requirements:

- Appropriate relational data modelling.
- Referential integrity.
- Primary and foreign keys.
- Unique constraints.
- Appropriate indexes.
- Transactions.
- Concurrency control.
- Database migrations.
- Backup and restoration.
- Connection pooling.
- Query optimization.
- Data retention policies.
- Auditability where required.

Use migrations for schema changes.

Do not make undocumented production database changes.

# PART 8 — PHASE 7: CODEBASE ENGINEERING

Maintain:

- Clear module boundaries.
- Separation of concerns.
- Consistent naming conventions.
- Strong typing where supported.
- Reusable components.
- Centralized configuration.
- Structured error handling.
- Appropriate logging.
- Dependency injection where useful.
- Version-controlled dependencies.
- Automated formatting.
- Static analysis.
- Linting.

Follow SOLID, DRY and KISS appropriately.

Avoid overengineering and unnecessary abstractions.

No unexplained hardcoded credentials or configuration.

# PART 9 — PHASE 8: DEVELOPMENT

Implement one module at a time.

For each module:

1. Identify requirements.
2. Review architecture.
3. Identify dependencies.
4. Design data contracts.
5. Implement backend.
6. Implement frontend.
7. Integrate the module.
8. Write automated tests.
9. Perform security review.
10. Update documentation.
11. Review actual changes.
12. Obtain verification before moving forward.

Never implement an entire application in one uncontrolled generation step.

# PART 10 — PHASE 9: TESTING

Establish automated testing for:

- Unit tests.
- Integration tests.
- API contract tests.
- End-to-end tests.
- Regression tests.
- Authentication tests.
- Authorization tests.
- Database tests.
- Concurrency tests.
- Security tests.
- Performance tests.
- Multi-instance tests.
- Failure recovery tests.

Test both expected and unexpected inputs.

Do not suppress failures to achieve a green test report.

Record test results and unresolved defects.

# PART 11 — PHASE 10: PERFORMANCE AND SCALABILITY

Measure and optimize:

- API response times.
- Database query performance.
- Memory utilization.
- CPU utilization.
- Concurrent requests.
- Database connections.
- Cache hit rates.
- Queue processing times.
- File handling.
- Network utilization.

Perform realistic load and stress tests.

Do not claim performance improvements without measurements.

# PART 12 — PHASE 11: DEVOPS AND DEPLOYMENT

Establish:

- Docker-based deployment.
- Separate development, staging and production environments.
- Infrastructure as code.
- Automated CI pipelines.
- Automated test execution.
- Controlled CD pipelines.
- Environment-specific configuration.
- Database migration procedures.
- Deployment health checks.
- Rollback procedures.
- Secure deployment credentials.
- Versioned releases.

Production deployments must not rely on undocumented manual steps.

# PART 13 — PHASE 12: OBSERVABILITY AND RECOVERY

Implement:

- Centralized structured logs.
- Application metrics.
- Infrastructure metrics.
- Distributed tracing where appropriate.
- Error tracking.
- Health monitoring.
- Alerting.
- Database monitoring.
- Backup verification.
- Disaster recovery documentation.

Define recovery time objective (RTO) and recovery point objective (RPO) with the project owner.

Perform restoration exercises.

# PART 14 — DOCUMENTATION

Maintain the following repository documents:

- PRD.md
- SRS.md
- ARCHITECTURE.md
- DATABASE_DESIGN.md
- API_SPECIFICATION.md
- SECURITY.md
- SCALABILITY.md
- TESTING_STRATEGY.md
- DEPLOYMENT.md
- DISASTER_RECOVERY.md
- CONTRIBUTING.md
- CHANGELOG.md

Maintain Architecture Decision Records in a dedicated decisions directory.

Update documentation whenever relevant implementation decisions change.

# PART 15 — AI DEVELOPMENT CONTROL

For every task:

1. Inspect before changing.
2. Plan before implementing.
3. Explain architectural impact.
4. Identify security implications.
5. Implement in controlled increments.
6. Run tests.
7. Inspect changed files.
8. Review regressions.
9. Update documentation.
10. Report evidence.

Do not invent completed work.

Do not claim tests passed without running them.

Do not silently change approved architecture.

Do not remove existing features without authorization.

Do not introduce unnecessary dependencies.

Do not use mock data as production data.

Do not bypass security for convenience.

# PART 16 — RELEASE ACCEPTANCE

The application can be considered production-ready only after:

- All critical requirements are implemented.
- Architecture has been reviewed.
- Critical security findings have been resolved.
- Authorization has been tested.
- Database migrations have been verified.
- Automated tests have passed.
- Performance targets have been measured.
- Multiple application instances have been tested.
- Failure and recovery procedures have been tested.
- Monitoring and alerts are operational.
- Backup restoration has been demonstrated.
- Deployment and rollback have been verified.
- Documentation is complete.
- Outstanding risks are formally recorded and accepted.

Never declare production readiness based solely on successful application startup.

---

# INITIAL EXECUTION COMMAND

Begin with repository discovery only.

Do not immediately generate features or rewrite existing files.

Return a detailed engineering assessment containing:

1. Current project condition.
2. Existing architecture.
3. Current technology stack.
4. Repository quality assessment.
5. Existing security posture.
6. Database assessment.
7. Multi-server readiness.
8. Scalability limitations.
9. Testing coverage and weaknesses.
10. Deployment readiness.
11. Architectural risks.
12. Recommended target architecture.
13. Required changes.
14. Ordered implementation roadmap.

For every finding, distinguish verified facts from assumptions.

Provide evidence using actual file paths, relevant code references and executed test results.

Wait for my approval of the architecture and roadmap before beginning major implementation.

Your responsibility is not merely to generate working code. Your responsibility is to engineer a secure, reliable, maintainable and production-ready software system.

# **5. Required repository structure**

Ask Antigravity to establish or adapt a structure similar to this. It must first inspect the existing project and avoid unnecessary restructuring.

```
project-root/
│
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── API_SPECIFICATION.md
│   ├── SECURITY.md
│   ├── SCALABILITY.md
│   ├── TESTING_STRATEGY.md
│   ├── DEPLOYMENT.md
│   └── DISASTER_RECOVERY.md
│
├── decisions/
│   └── ADR/
│
├── frontend/
│
├── backend/
│   ├── api/
│   ├── core/
│   ├── modules/
│   ├── services/
│   ├── repositories/
│   ├── schemas/
│   ├── security/
│   └── workers/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   ├── monitoring/
│   └── terraform/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   └── performance/
│
├── scripts/
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

This is a conceptual structure, not a requirement to create empty directories or force a particular framework into them.

# **6. Mandatory acceptance gates**

Antigravity should work with explicit approval gates.

| Gate | Required approval                     |
| ---- | ------------------------------------- |
| G1   | Repository assessment                 |
| G2   | Requirements and scope                |
| G3   | Architecture and technology decisions |
| G4   | Database and security design          |
| G5   | Infrastructure foundation             |
| G6   | Core module implementation            |
| G7   | Feature integration                   |
| G8   | Security and QA                       |
| G9   | Multi-server validation               |
| G10  | Production deployment                 |

A failed gate means the relevant work must be corrected before proceeding.

# **7. How to begin in Antigravity**

Follow these exact steps:

1. Open your existing project in Antigravity.
2. Ensure the correct Git repository is connected.
3. Save the master engineering directive in your project documentation.
4. Submit the master instruction.
5. Allow Antigravity to inspect the existing repository.
6. Review its architecture assessment and proposed roadmap.
7. Approve the architecture before implementation.
8. Execute one approved phase at a time.
9. Require test evidence and Git commits for completed phases.

**Do not let Antigravity execute all 17 phases in one go.** Use the roadmap as a controlled development process.

## **8. One additional requirement: independent engineering audits**

I strongly recommend adding an independent review after every major development milestone.

The AI that writes a feature should not be the only mechanism deciding whether that feature is correct.

Use separate review tasks for:

- Architecture compliance.
- Security vulnerabilities.
- Database integrity.
- Code quality.
- Test quality.
- Multi-server compatibility.
- Deployment readiness.

This helps reduce the risk of AI-generated code appearing correct while containing hidden architectural or security weaknesses.

**Your final engineering philosophy should be:**

> AI writes the code. Engineering standards control the code. Automated tests verify the code. Independent reviews challenge the code. Production evidence proves the system is ready.

The first deliverable should be a repository assessment and approved architecture—not a new feature.