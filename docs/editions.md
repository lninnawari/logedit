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

- Public client upload form.
- Intake queue for client-submitted logs.
- Client approval/rejection workflow.
- Client-facing project status page.
- Payment/deadline/work-order management.

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

## 2. Client Upload Form Edition

This is the expanded version for an operator who accepts logs from clients through the app.

### User Flow

- The operator deploys the app and creates the first admin account.
- A client opens a public upload form.
- The client enters their name/contact and uploads or pastes an HTML log.
- The uploaded log is stored as a project with an intake/review status.
- The operator logs in, reviews the submitted project, and manages the editing workflow.
- The operator sends shared edit links to participants or clients.
- Final preview/download remains admin-only.

### Included Features

Everything in Basic Distribution Edition, plus:

- Public client upload form.
- Client/contact intake.
- Submitted project queue.
- Admin review/approval workflow.
- Project-client linkage.
- Optional operator notes, deadlines, or intake status fields if added later.

### DB Models

Required:

- `Project`
- `MessageBlock`
- `ShareLink`
- `CorrectionSettings`
- `AdminUser`
- `Client`
- `ProjectClient`

Likely future additions:

- `Project.status` values beyond `editing`, `confirmed`, `downloaded`, such as `submitted` or `intake`.
- Optional `ClientUpload` or intake metadata model if public uploads need audit fields separate from `Project`.

### API Surface

Required:

- `/api/setup/*`
- `/api/admin/*`
- `/api/projects/*`
- `/api/share/*`
- `/api/clients/*`

Needs implementation:

- Public upload endpoint, for example `/api/intake/projects`.
- Public upload page, for example `/upload`.
- Admin intake queue/filtering.

## Current Repository State

The current repository is fixed to the Basic Distribution Edition:

- It has `AdminUser`, first-run admin setup, and admin login.
- It has admin-only project upload/management.
- It has shared participant editing.
- It has no `Client` or `ProjectClient` models in the current Prisma schema.
- It has no `/api/clients` route.
- It has no client registration UI or project-client linking UI.
- It does not have a public client upload form.

Therefore:

- It is the Basic Distribution Edition baseline.
- The Client Upload Form Edition should be built later by adding `Client`, `ProjectClient`, public upload/intake, and admin intake queue features on top of this baseline.
