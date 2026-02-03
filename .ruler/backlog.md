# Extractify Product Roadmap

> **Vision**: Enable any business to extract structured data from unstructured sources using AI, without writing code.

---

## Progress Summary

| Phase | Completed | Total | % Complete |
|-------|-----------|-------|------------|
| Phase 1: MVP | 18 | 73 | 25% |
| Phase 2: Growth | 0 | 29 | 0% |
| Phase 3: Scale | 0 | 43 | 0% |
| **Overall** | **18** | **145** | **12%** |

---

## Release Phases

| Phase | Focus | Timeline |
|-------|-------|----------|
| **Phase 1: MVP** | Core extraction + basic integrations | Weeks 1-8 |
| **Phase 2: Growth** | Team features + advanced sources | Weeks 9-16 |
| **Phase 3: Scale** | Enterprise + automation triggers | Weeks 17-24 |

---

## Phase 1: MVP (Market Entry)

### 1.1 User Authentication & Onboarding

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| AUTH-001 | [x] | As a user, I can sign in with Google OAuth so that I can access the platform quickly | P0 |
| AUTH-002 | [ ] | As a new user, I see an onboarding tutorial so that I understand how Extractify works | P1 |
| AUTH-003 | [ ] | As a user, I can update my profile information (name, avatar) so that my identity is personalized | P2 |
| AUTH-004 | [ ] | As a user, I can enable 2FA so that my account is more secure | P2 |
| AUTH-005 | [ ] | As a user, I can see my session history so that I can monitor account access | P3 |

---

### 1.2 Attribute Model Management

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| MODEL-001 | [x] | As a user, I can create an attribute model with a name and description so that I can define what data to extract | P0 |
| MODEL-002 | [x] | As a user, I can add string attributes to a model so that I can extract text fields | P0 |
| MODEL-003 | [ ] | As a user, I can add number attributes to a model so that I can extract numeric values | P0 |
| MODEL-004 | [ ] | As a user, I can add boolean attributes to a model so that I can extract yes/no values | P0 |
| MODEL-005 | [ ] | As a user, I can add date attributes to a model so that I can extract temporal data | P0 |
| MODEL-006 | [x] | As a user, I can add array-of-strings attributes so that I can extract multiple values | P0 |
| MODEL-007 | [x] | As a user, I can add nested object attributes so that I can extract complex structures | P1 |
| MODEL-008 | [ ] | As a user, I can add enum attributes with predefined options so that extraction is constrained | P1 |
| MODEL-009 | [ ] | As a user, I can mark attributes as required so that missing data is flagged | P1 |
| MODEL-010 | [x] | As a user, I can add AI hints to attributes so that the LLM has better context | P1 |
| MODEL-011 | [ ] | As a user, I can add validation patterns (regex) to string attributes so that format is enforced | P2 |
| MODEL-012 | [ ] | As a user, I can set min/max constraints on number attributes so that values are bounded | P2 |
| MODEL-013 | [x] | As a user, I can add description/help text to attributes so that their purpose is clear | P2 |
| MODEL-014 | [ ] | As a user, I can duplicate an existing model so that I can create variations quickly | P2 |
| MODEL-015 | [ ] | As a user, I can import a model from JSON schema so that I can reuse existing definitions | P3 |
| MODEL-016 | [ ] | As a user, I can export a model to JSON schema so that I can use it elsewhere | P3 |

---

### 1.3 Model Versioning

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| VER-001 | [x] | As a user, I can create a new version of a model so that I can evolve schemas safely | P0 |
| VER-002 | [x] | As a user, I can see the version history of a model so that I can track changes | P0 |
| VER-003 | [ ] | As a user, I can compare two versions of a model so that I can see what changed | P1 |
| VER-004 | [x] | As a user, I can set a version as "active" so that extractions use the correct schema | P1 |
| VER-005 | [ ] | As a user, I can revert to a previous model version so that I can undo mistakes | P2 |
| VER-006 | [ ] | As a user, I can add a changelog note when creating a version so that changes are documented | P2 |
| VER-007 | [ ] | As a user, I can branch a version to create experimental variants so that I can test changes | P3 |

---

### 1.4 Document Source (Core)

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| SRC-DOC-001 | [x] | As a user, I can upload a PDF document so that I can extract data from it | P0 |
| SRC-DOC-002 | [ ] | As a user, I can upload a DOCX document so that I can extract data from it | P0 |
| SRC-DOC-003 | [ ] | As a user, I can upload a TXT file so that I can extract data from plain text | P0 |
| SRC-DOC-004 | [ ] | As a user, I can see a preview of uploaded documents so that I can verify the content | P1 |
| SRC-DOC-005 | [x] | As a user, I can upload multiple documents at once (batch) so that I can process many files | P1 |
| SRC-DOC-006 | [x] | As a user, I can upload documents via drag-and-drop so that the experience is intuitive | P1 |
| SRC-DOC-007 | [ ] | As a user, I can see the text extraction result before running the LLM so that I can verify parsing | P2 |
| SRC-DOC-008 | [ ] | As a user, I can upload Markdown files so that I can extract from formatted text | P2 |
| SRC-DOC-009 | [ ] | As a user, I can upload HTML files so that I can extract from web content | P2 |
| SRC-DOC-010 | [ ] | As a user, I can set document language hints so that OCR/parsing is more accurate | P3 |

---

### 1.5 Image Source

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| SRC-IMG-001 | [x] | As a user, I can upload an image (PNG, JPG, WebP) so that I can extract data from it | P0 |
| SRC-IMG-002 | [x] | As a user, I can upload multiple images at once so that I can batch process | P1 |
| SRC-IMG-003 | [ ] | As a user, I can see image previews before extraction so that I verify the upload | P1 |
| SRC-IMG-004 | [ ] | As a user, I can crop/rotate images before extraction so that I focus on relevant areas | P2 |
| SRC-IMG-005 | [x] | As a user, I can extract text via OCR from images so that I process scanned documents | P1 |
| SRC-IMG-006 | [x] | As a user, I can use vision models to understand image content so that I extract visual data | P1 |

---

### 1.6 Audio Source

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| SRC-AUD-001 | [ ] | As a user, I can upload an audio file (MP3, WAV, M4A) so that I can extract data from it | P0 |
| SRC-AUD-002 | [ ] | As a user, I can see the transcription before extraction so that I verify accuracy | P1 |
| SRC-AUD-003 | [ ] | As a user, I can upload multiple audio files at once so that I can batch process | P1 |
| SRC-AUD-004 | [ ] | As a user, I can set language hints for transcription so that accuracy improves | P2 |
| SRC-AUD-005 | [ ] | As a user, I can edit the transcription before extraction so that I fix errors | P2 |
| SRC-AUD-006 | [ ] | As a user, I can see speaker diarization so that I know who said what | P3 |

---

### 1.7 LLM Extraction Engine

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| EXT-001 | [x] | As a user, I can run an extraction with a model + source so that I get structured data | P0 |
| EXT-002 | [x] | As a user, I can see the extraction result in a structured view so that I can review it | P0 |
| EXT-003 | [x] | As a user, I can select a specific LLM model for extraction so that I can control performance | P0 |
| EXT-004 | [ ] | As a user, I can edit extraction results before saving so that I can fix errors | P1 |
| EXT-005 | [x] | As a user, I can see extraction confidence scores so that I know data reliability | P1 |
| EXT-006 | [ ] | As a user, I can re-run an extraction with different settings so that I improve results | P1 |
| EXT-007 | [ ] | As a user, I can see the raw LLM response for debugging so that I troubleshoot issues | P2 |
| EXT-008 | [ ] | As a user, I can configure extraction "temperature" so that I control creativity vs. accuracy | P2 |
| EXT-009 | [ ] | As a user, I can choose which LLM provider to use (OpenAI, Anthropic, etc.) so that I balance cost/quality | P2 |
| EXT-010 | [x] | As a user, I can see token usage per extraction so that I monitor costs | P1 |
| EXT-011 | [ ] | As a user, I can set a token budget limit so that I control spending | P2 |
| EXT-012 | [ ] | As a user, I can save extraction templates (model + source type) so that I reuse configurations | P2 |
| EXT-013 | [ ] | As a user, I can run an extraction in "preview" mode (sample data) so that I test before full run | P2 |

---

### 1.8 Google Sheets Integration

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TGT-SHEET-001 | [ ] | As a user, I can connect my Google account so that I can export to Sheets | P0 |
| TGT-SHEET-002 | [ ] | As a user, I can create a new spreadsheet from extraction results so that I have a clean export | P0 |
| TGT-SHEET-003 | [ ] | As a user, I can append extraction results to an existing sheet so that I build datasets | P0 |
| TGT-SHEET-004 | [ ] | As a user, I can map model attributes to spreadsheet columns so that I control the layout | P1 |
| TGT-SHEET-005 | [ ] | As a user, I can preview the export before sending so that I verify the format | P1 |
| TGT-SHEET-006 | [ ] | As a user, I can schedule automatic exports after each extraction so that data flows continuously | P2 |
| TGT-SHEET-007 | [ ] | As a user, I can choose which sheet/tab to export to so that I organize data | P2 |

---

### 1.9 PostgreSQL Integration

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TGT-PG-001 | [ ] | As a user, I can configure a PostgreSQL connection so that I can export data | P0 |
| TGT-PG-002 | [ ] | As a user, I can test the database connection so that I verify connectivity | P0 |
| TGT-PG-003 | [ ] | As a user, I can create a table from a model schema so that the structure is auto-generated | P1 |
| TGT-PG-004 | [ ] | As a user, I can map model attributes to table columns so that I control the mapping | P1 |
| TGT-PG-005 | [ ] | As a user, I can choose insert/upsert/update behavior so that I control data handling | P1 |
| TGT-PG-006 | [ ] | As a user, I can see export history and errors so that I troubleshoot failures | P2 |
| TGT-PG-007 | [ ] | As a user, I can schedule automatic exports so that data flows continuously | P2 |
| TGT-PG-008 | [ ] | As a user, I can use connection pooling so that I handle high volumes | P3 |

---

### 1.10 MongoDB Integration

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TGT-MONGO-001 | [ ] | As a user, I can configure a MongoDB connection so that I can export data | P0 |
| TGT-MONGO-002 | [ ] | As a user, I can test the database connection so that I verify connectivity | P0 |
| TGT-MONGO-003 | [ ] | As a user, I can export extraction results to a collection so that data is stored | P0 |
| TGT-MONGO-004 | [ ] | As a user, I can choose the collection name so that I organize data | P1 |
| TGT-MONGO-005 | [ ] | As a user, I can choose insert/upsert behavior so that I control data handling | P1 |
| TGT-MONGO-006 | [ ] | As a user, I can see export history and errors so that I troubleshoot failures | P2 |
| TGT-MONGO-007 | [ ] | As a user, I can schedule automatic exports so that data flows continuously | P2 |

---

### 1.11 Extraction History & Management

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| HIST-001 | [x] | As a user, I can see a history of all extractions so that I track my work | P0 |
| HIST-002 | [x] | As a user, I can view details of a past extraction so that I review results | P0 |
| HIST-003 | [ ] | As a user, I can re-run a past extraction so that I get updated results | P1 |
| HIST-004 | [ ] | As a user, I can delete an extraction so that I clean up old data | P1 |
| HIST-005 | [ ] | As a user, I can filter extraction history by model, date, status so that I find specific runs | P1 |
| HIST-006 | [ ] | As a user, I can export extraction history to CSV so that I have backups | P2 |
| HIST-007 | [ ] | As a user, I can tag extractions for organization so that I group related work | P2 |

---

## Phase 2: Growth Features

### 2.1 Team Collaboration

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TEAM-001 | [ ] | As a user, I can create a team/organization so that I can collaborate with others | P0 |
| TEAM-002 | [ ] | As a user, I can invite team members by email so that they can join my team | P0 |
| TEAM-003 | [ ] | As a user, I can assign roles (admin, editor, viewer) so that I control permissions | P0 |
| TEAM-004 | [ ] | As a user, I can share models with my team so that we can collaborate on schemas | P1 |
| TEAM-005 | [ ] | As a user, I can share extraction templates with my team so that we have consistent workflows | P1 |
| TEAM-006 | [ ] | As a user, I can see team activity logs so that I know who did what | P2 |
| TEAM-007 | [ ] | As a user, I can set up team-wide LLM API keys so that billing is centralized | P1 |
| TEAM-008 | [ ] | As a user, I can remove team members so that I manage access | P1 |
| TEAM-009 | [ ] | As a user, I can transfer team ownership so that administration can change | P2 |

---

### 2.2 Project & Workspace Organization

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| PROJ-001 | [ ] | As a user, I can create projects to organize models and extractions so that I separate work | P1 |
| PROJ-002 | [ ] | As a user, I can move models between projects so that I reorganize | P2 |
| PROJ-003 | [ ] | As a user, I can archive projects so that I hide inactive work | P2 |
| PROJ-004 | [ ] | As a user, I can set project-level permissions so that I control access granularly | P2 |
| PROJ-005 | [ ] | As a user, I can see project-level usage analytics so that I understand activity | P2 |

---

### 2.3 Advanced Source: URL Scraping

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| SRC-URL-001 | [ ] | As a user, I can provide a URL so that I can extract data from a webpage | P1 |
| SRC-URL-002 | [ ] | As a user, I can see a preview of the scraped content so that I verify what was captured | P1 |
| SRC-URL-003 | [ ] | As a user, I can configure selectors to target specific page regions so that I focus on relevant content | P2 |
| SRC-URL-004 | [ ] | As a user, I can handle JavaScript-rendered pages so that I capture dynamic content | P2 |
| SRC-URL-005 | [ ] | As a user, I can set authentication for protected pages so that I access gated content | P3 |
| SRC-URL-006 | [ ] | As a user, I can batch process multiple URLs so that I scale extraction | P2 |

---

### 2.4 API Access

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| API-001 | [ ] | As a user, I can generate API keys so that I access Extractify programmatically | P0 |
| API-002 | [ ] | As a user, I can create extractions via API so that I integrate with my systems | P0 |
| API-003 | [ ] | As a user, I can upload sources via API so that I automate data ingestion | P0 |
| API-004 | [ ] | As a user, I can retrieve extraction results via API so that I consume data programmatically | P0 |
| API-005 | [ ] | As a user, I can manage models via API so that I automate schema changes | P1 |
| API-006 | [ ] | As a user, I can set API key permissions (read-only, full access) so that I control security | P1 |
| API-007 | [ ] | As a user, I can see API usage and rate limits so that I monitor consumption | P2 |
| API-008 | [ ] | As a user, I can regenerate API keys so that I rotate credentials | P1 |
| API-009 | [ ] | As a user, I can configure webhook callbacks so that I receive async notifications | P2 |

---

### 2.5 Billing & Subscription

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| BILL-001 | [ ] | As a user, I can see my current plan and usage so that I understand my subscription | P0 |
| BILL-002 | [ ] | As a user, I can upgrade/downgrade my plan so that I match my needs | P0 |
| BILL-003 | [ ] | As a user, I can add a payment method so that I can subscribe to paid plans | P0 |
| BILL-004 | [ ] | As a user, I can see my billing history and invoices so that I track expenses | P1 |
| BILL-005 | [ ] | As a user, I can set usage alerts so that I'm notified before overage | P1 |
| BILL-006 | [ ] | As a user, I can purchase additional extraction credits so that I handle spikes | P2 |
| BILL-007 | [ ] | As a user, I can cancel my subscription so that I stop billing | P1 |
| BILL-008 | [ ] | As a user, I can use a free tier with limited extractions so that I try the product | P0 |

---

### 2.6 Templates Marketplace

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TMPL-001 | [ ] | As a user, I can browse pre-built extraction templates so that I get started quickly | P1 |
| TMPL-002 | [ ] | As a user, I can install a template to my workspace so that I can use it | P1 |
| TMPL-003 | [ ] | As a user, I can filter templates by category (invoices, receipts, contracts) so that I find relevant ones | P1 |
| TMPL-004 | [ ] | As a user, I can rate and review templates so that I help others choose | P2 |
| TMPL-005 | [ ] | As a user, I can publish my templates publicly so that I share with the community | P2 |
| TMPL-006 | [ ] | As a user, I can fork a template so that I customize it for my needs | P2 |

---

## Phase 3: Scale & Enterprise

### 3.1 Trigger: Social Media

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TRIG-SOC-001 | [ ] | As a user, I can connect my Twitter/X account so that I can monitor tweets | P1 |
| TRIG-SOC-002 | [ ] | As a user, I can define keyword/hashtag triggers so that I capture relevant tweets | P1 |
| TRIG-SOC-003 | [ ] | As a user, I can automatically extract data from matched tweets so that data flows continuously | P1 |
| TRIG-SOC-004 | [ ] | As a user, I can connect my LinkedIn account so that I can monitor posts | P2 |
| TRIG-SOC-005 | [ ] | As a user, I can filter by author/account so that I focus on specific sources | P2 |
| TRIG-SOC-006 | [ ] | As a user, I can see a log of triggered extractions so that I monitor activity | P2 |

---

## Phase 3: Scale & Enterprise

### 3.2 Trigger: Website Monitoring

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TRIG-WEB-001 | [ ] | As a user, I can configure a URL to monitor for changes so that I detect updates | P1 |
| TRIG-WEB-002 | [ ] | As a user, I can set monitoring frequency (hourly, daily) so that I control polling | P1 |
| TRIG-WEB-003 | [ ] | As a user, I can automatically run extraction when content changes so that I capture updates | P1 |
| TRIG-WEB-004 | [ ] | As a user, I can monitor RSS/Atom feeds for new items so that I capture articles | P2 |
| TRIG-WEB-005 | [ ] | As a user, I can monitor sitemaps for new pages so that I discover content | P2 |
| TRIG-WEB-006 | [ ] | As a user, I can see a diff of what changed so that I understand updates | P2 |

---

### 3.3 Trigger: Email Inbox

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TRIG-EMAIL-001 | [ ] | As a user, I can connect my email inbox (Gmail, Outlook) so that I can process emails | P1 |
| TRIG-EMAIL-002 | [ ] | As a user, I can define filters (from, subject, labels) so that I capture relevant emails | P1 |
| TRIG-EMAIL-003 | [ ] | As a user, I can automatically extract data from matched emails so that data flows continuously | P1 |
| TRIG-EMAIL-004 | [ ] | As a user, I can extract data from email attachments so that I process attached documents | P2 |
| TRIG-EMAIL-005 | [ ] | As a user, I can see a log of processed emails so that I monitor activity | P2 |

---

### 3.4 Trigger: Cloud Storage

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TRIG-CLOUD-001 | [ ] | As a user, I can connect my Google Drive so that I can monitor for new files | P1 |
| TRIG-CLOUD-002 | [ ] | As a user, I can connect my Dropbox so that I can monitor for new files | P2 |
| TRIG-CLOUD-003 | [ ] | As a user, I can connect my S3 bucket so that I can monitor for new files | P2 |
| TRIG-CLOUD-004 | [ ] | As a user, I can define folder/path filters so that I focus on relevant files | P1 |
| TRIG-CLOUD-005 | [ ] | As a user, I can automatically extract data from new files so that data flows continuously | P1 |
| TRIG-CLOUD-006 | [ ] | As a user, I can see a log of processed files so that I monitor activity | P2 |

---

### 3.5 Advanced Integrations

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| TGT-REST-001 | [ ] | As a user, I can configure a webhook URL so that I send extraction results via HTTP | P1 |
| TGT-REST-002 | [ ] | As a user, I can customize the webhook payload format so that I match my API | P2 |
| TGT-REST-003 | [ ] | As a user, I can export to Airtable so that I use low-code databases | P2 |
| TGT-REST-004 | [ ] | As a user, I can export to Notion databases so that I integrate with my wiki | P2 |
| TGT-REST-005 | [ ] | As a user, I can export to Excel files (XLSX) so that I use desktop tools | P1 |
| TGT-REST-006 | [ ] | As a user, I can export to CSV files so that I have some exports | P1 |
| TGT-S3-001 | [ ] | As a user, I can export results to S3/GCS so that I store in cloud buckets | P2 |

---

### 3.6 Enterprise Features

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| ENT-001 | [ ] | As an admin, I can configure SSO (SAML, OIDC) so that enterprise users use corporate identity | P1 |
| ENT-002 | [ ] | As an admin, I can enforce password policies so that security is strengthened | P2 |
| ENT-003 | [ ] | As an admin, I can see organization-wide audit logs so that I track all activity | P1 |
| ENT-004 | [ ] | As an admin, I can set data retention policies so that I comply with regulations | P2 |
| ENT-005 | [ ] | As an admin, I can configure IP allowlists so that I restrict access | P2 |
| ENT-006 | [ ] | As an admin, I can manage multiple teams within an organization so that I have hierarchy | P2 |
| ENT-007 | [ ] | As an admin, I can set organization-wide LLM provider quotas so that I control costs | P2 |
| ENT-008 | [ ] | As an admin, I can export all organization data so that I have backups | P2 |
| ENT-009 | [ ] | As an admin, I can configure SCIM provisioning so that users sync from identity providers | P3 |

---

### 3.7 Analytics & Reporting

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| ANLYT-001 | [ ] | As a user, I can see a dashboard of extraction metrics so that I understand usage | P1 |
| ANLYT-002 | [ ] | As a user, I can see charts of extraction volume over time so that I spot trends | P1 |
| ANLYT-003 | [ ] | As a user, I can see LLM token usage breakdown so that I understand costs | P1 |
| ANLYT-004 | [ ] | As a user, I can see success/failure rates by model so that I identify issues | P2 |
| ANLYT-005 | [ ] | As a user, I can export analytics data so that I analyze in external tools | P2 |
| ANLYT-006 | [ ] | As an admin, I can see team-level analytics so that I understand team performance | P2 |
| ANLYT-007 | [ ] | As a user, I can set up scheduled reports (email) so that I receive updates automatically | P3 |

---

### 3.8 AI Model Fine-tuning

| ID | Done | User Story | Priority |
|----|------|------------|----------|
| FINETUNE-001 | [ ] | As a user, I can mark extractions as "correct" or "incorrect" so that I provide feedback | P2 |
| FINETUNE-002 | [ ] | As a user, I can see accuracy metrics for models over time so that I track improvement | P2 |
| FINETUNE-003 | [ ] | As a user, I can use my feedback data to improve extraction prompts so that accuracy increases | P2 |
| FINETUNE-004 | [ ] | As a power user, I can fine-tune a custom LLM on my extraction data so that I get specialized models | P3 |
| FINETUNE-005 | [ ] | As a user, I can A/B test different extraction strategies so that I optimize results | P3 |

---

## Non-Functional Requirements

### Performance

| ID | Done | Requirement |
|----|------|-------------|
| NFR-PERF-001 | [ ] | Extraction of a single document should complete in < 30 seconds |
| NFR-PERF-002 | [ ] | Batch processing of 100 documents should complete in < 10 minutes |
| NFR-PERF-003 | [ ] | Dashboard should load in < 2 seconds |
| NFR-PERF-004 | [ ] | API response time should be < 500ms for metadata operations |

### Security

| ID | Done | Requirement |
|----|------|-------------|
| NFR-SEC-001 | [ ] | All data at rest must be encrypted (AES-256) |
| NFR-SEC-002 | [ ] | All data in transit must use TLS 1.3 |
| NFR-SEC-003 | [ ] | PII data must be automatically detected and handled per compliance settings |
| NFR-SEC-004 | [ ] | Database credentials must be stored in secure vault |
| NFR-SEC-005 | [ ] | API keys must be hashed (bcrypt) and never displayed after creation |

### Reliability

| ID | Done | Requirement |
|----|------|-------------|
| NFR-REL-001 | [ ] | Service uptime target: 99.9% |
| NFR-REL-002 | [ ] | Automatic retry of failed extractions (3 attempts with exponential backoff) |
| NFR-REL-003 | [ ] | Data backups every 6 hours with 30-day retention |
| NFR-REL-004 | [ ] | Multi-region deployment for disaster recovery |

### Compliance

| ID | Done | Requirement |
|----|------|-------------|
| NFR-COMP-001 | [ ] | GDPR compliance: data export, deletion on request |
| NFR-COMP-002 | [ ] | SOC 2 Type II certification (enterprise tier) |
| NFR-COMP-003 | [ ] | Data residency options (EU, US, APAC) |

---

## Pricing Tiers (Suggested)

| Tier           | Price  | Extractions/mo | Features                                                |
|----------------|--------|----------------|---------------------------------------------------------|
| **Free**       | $0     | 50             | Basic models, manual sources, Google Sheets export      |
| **Pro**        | $29/mo | 500            | All sources, all exports, API access, 2 team members    |
| **Team**       | $99/mo | 2,000          | Unlimited team members, project organization, templates |
| **Enterprise** | Custom | Unlimited      | SSO, audit logs, SLA, dedicated support, fine-tuning    |

---

## Success Metrics (KPIs)

| Metric                       | Target (MVP) | Target (12mo) |
|------------------------------|--------------|---------------|
| Monthly Active Users         | 100          | 5,000         |
| Extractions/Month            | 1,000        | 100,000       |
| Paid Conversion Rate         | 5%           | 10%           |
| Churn Rate                   | < 10%        | < 5%          |
| NPS Score                    | 30           | 50            |
| Avg. Extraction Success Rate | 85%          | 95%           |
