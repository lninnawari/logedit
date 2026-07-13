# Edition Classification

This project is split into two product editions.

## 1. Basic Distribution Edition

This is the version for a buyer/operator who deploys the app for their own use.

### User Flow

- The operator deploys the app and connects their own PostgreSQL database.
- On first launch, if there is no administrator account, the browser shows the initial admin setup screen.
- The operator creates the first admin account.
- The operator logs in and uploads Roll20/Cocofolia/generic HTML logs.
- Participants receive a shared edit link and password.
- Participants can only view/edit existing message blocks through the shared editor.
- The operator previews/downloads the corrected TXT and manages/deletes projects.

### Included Features

- First-run admin setup.
- Admin login.
- Admin-only project upload.
- Admin-only project list, preview, download, settings, and delete.
- Shared link password verification.
- Shared editor for participants.
- Correction settings, including custom image/handout icon.
- Roll20/Cocofolia/generic parser support.

### Excluded Features

- Public original-log upload form.
- Intake queue for externally submitted logs.
- Submitter approval/rejection workflow.
- Submitter-facing project status page.
- Payment/deadline/work-order management.
- Public upload submitter profile management.

### DB Models

Required:

- `Project`
- `MessageBlock`
- `ShareLink`
- `CorrectionSettings`
- `AdminUser`

Not required:

- `Client`
- `ProjectClient`

Implementation note:

- `AdminUser` is included even in the Basic Distribution Edition because the deployed admin page must be protected when the app is reachable from another browser or computer.
- `Client` and `ProjectClient` must be disabled, hidden, or removed from the Basic Distribution Edition unless the edition intentionally includes operator-side client memo features.

### API Surface

Required:

- `/api/setup/*`
- `/api/admin/*`
- `/api/projects/*`
- `/api/share/*`

Not required:

- `/api/clients/*`

### Current Code Gap For This Edition

- Basic Distribution Edition cleanup is complete in the current codebase.
- `Client`, `ProjectClient`, `/api/clients`, client panel UI, and project-client linking have been removed from the basic code path.

## 2. Hosted Original Upload Edition

This is the hosted version for an operator who asks log owners to upload original HTML logs before TXT cleanup and InDesign work. It is not a commission-management or client-management system.

### User Flow

- The operator deploys the app and creates the first admin account.
- A log owner opens a public upload form.
- The log owner enters a project title in `nickname - scenario title` format and uploads or pastes an HTML log.
- The uploaded log is stored directly as a project.
- The operator logs in and manages the editing workflow.
- The operator sends shared edit links to participants when needed.
- Final preview/download remains admin-only.

### Included Features

Everything in Basic Distribution Edition, plus:

- Public original-log upload form.
- Admin visibility for uploaded projects.

### DB Models

Required:

- `Project`
- `MessageBlock`
- `ShareLink`
- `CorrectionSettings`
- `AdminUser`

Likely future additions:

- Optional `UploadSubmission` model if public uploads need audit fields separate from `Project`.

### API Surface

Required:

- `/api/setup/*`
- `/api/admin/*`
- `/api/projects/*`
- `/api/share/*`

Implemented in the hosted upload baseline:

- One-time public upload endpoint: `/api/intake/:token/projects`.
- One-time public upload page: `/intake/:token`.
- Admin visibility through the normal project list.

## Current Repository State

The current repository has been expanded from the Basic Distribution baseline to the Hosted Original Upload Edition:

- It has `AdminUser`, first-run admin setup, and admin login.
- It has admin-only project upload/management.
- It has shared participant editing.
- It has `/api/intake/:token/projects` for one-time original-log uploads.
- It has admin-generated `/intake/:token` pages for log owners.
- Public uploads appear in the admin project list.

Therefore:

- It is now the hosted original-log upload baseline.
- The earlier Basic Distribution Edition can still be recovered later by hiding/removing public intake if a downloadable buyer-deployed version is needed.
