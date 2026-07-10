# Electron Client

The Electron client is a Basic Distribution Edition companion app.

## Scope

- Stores only the server URL, admin token, and admin profile in local app storage.
- Does not store source HTML, message blocks, projects, or final TXT data as app state.
- Calls the deployed/local server APIs for all project data.

## Run Locally

Start the server first:

```bash
npm start
```

Then run the Electron client:

```bash
npm run electron
```

Use `http://localhost:3000` as the server URL for local testing.

## Supported Workflows

- Save server URL.
- Create first administrator if the connected server has no admin account.
- Admin login/logout.
- Upload HTML file or pasted HTML.
- View project list.
- Open shared edit link in the system browser.
- Preview corrected TXT.
- Save corrected TXT to a local `.txt` file.
- Delete a project.

## Packaging Status

Installer packaging is configured with Electron Builder.

Directory package check:

```bash
npm run electron:pack
```

Windows installer build:

```bash
npm run electron:dist
```

Build output is written to `release/`.

Current verification:

- `npm run electron:pack` succeeds.
- `npm run electron:dist` succeeds and creates `release/TRPG Log Editor Setup 1.0.0.exe`.
- The Electron client is packaged from `electron/` only, so server dependencies are not bundled into the installer.

Known packaging polish:

- The default Electron icon is still used.
- The Windows installer is currently around 99 MB.
