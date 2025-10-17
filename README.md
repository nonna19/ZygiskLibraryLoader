# Zygisk Library Loader

**Version:** 1.0.0
**Author:** Arjun (nepmods)

---

## Overview

NepMods Zygisk Library Loader is a lightweight Zygisk module that conditionally injects a native shared library (`libxxx.so`) into target Android app processes. Configuration is managed via a JSON file located inside the module directory and a small web-based configuration UI (`webroot/`) that lets you add/remove packages, toggle injection, and set custom library paths.

This README explains how to build the project (using Gradle), how to configure the module and the web UI, and where to change the project config path used by the frontend JavaScript.

---

## Badges

![version](https://img.shields.io/badge/version-1.0.0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Features

* Per-package enable/disable via `config.json`
* Loads `libxxx.so` from target app's data directory using `System.load()` inside the target JVM
* Auto-unloads the module for non-targeted processes (minimizes runtime overhead)
* Simple web UI (KernelSU Web UI friendly) for editing and backing up configs

---

## Requirements

* Android Studio / Gradle (for building the Android/Java parts if any)
* Android NDK (r21+ recommended) — only if you compile native parts inside the repo
* Magisk (with Zygisk) or KernelSU with Zygisk support
* `zygisk.hpp` (Magisk SDK headers available in the Magisk source or SDK)
* `nlohmann/json.hpp` single-header for JSON parsing
* `log.h` helper (or use Android `__android_log_print` directly)

---

## Versioning

This repository uses semantic versioning. Current release: **1.0.0**. Tag releases as `v1.0.0`, `v1.0.1`, etc.

---

## Build (Gradle)

This project includes a Gradle-based build for the Android-side packaging. Use the following command from the repo root:

```bash
./gradlew :module:assembleDebug
```

* Replace `module` with your module's Gradle project name (e.g. `zygisk-loader`, `nepmods`, etc.).
* For release builds use `:module:assembleRelease`.
* If you have native `.so` components you build with NDK, ensure they are produced and placed into the module packaging directory prior to building.

**Tip:** Run a clean build when switching ABIs or making major changes:

```bash
./gradlew clean :module:assembleDebug
```

---

## Important: Update Web UI Config Path

Before using the Web UI (or before packaging), update the JavaScript configuration path so the UI reads/writes the correct `config.json` location on device.

Open:

```
webroot/main.js
```

Find the `CONFIG_FILE` constant near the top of the file and change it to match your module path. Example in the shipped web UI might look like:

```js
const CONFIG_FILE = '/data/adb/modules/nepmodslibloader/config.json';
```

Change the path to the path you will use on-device. Common choices:

* Magisk module default: `/data/adb/modules/<your_module_name>/config.json`
* Custom: `/data/local/tmp/<your_project>/config.json`
* Backup path used by the web UI is: `/data/adb/nepmods_config_backup.json` (can be changed in `main.js`)

> **Make sure this is correct before saving configs from the web UI**. Incorrect paths will result in unreadable or unwritable config files.

---

## Project Layout (suggested)

```
repo-root/
├── module/                     # Gradle project for the module packaging
├── webroot/                    # Web configuration UI
│   ├── index.html
│   ├── main.js                  # <-- change CONFIG_FILE here
│   └── styles.css
└── README.md
```

---

## `config.json` Format

Place `config.json` inside your module folder (or the path referenced by `main.js`). Example:

```json
{
  "com.example.app1": {
    "status": true,
    "defaultLib": true,
    "libPath": ""
  },
  "com.example.app2": {
    "status": false
  }
}
```

* `status`: `true` or `false` — whether to inject `libmain.so` for that package
* `defaultLib`: `true` to use `/data/user/0/<package>/libmain.so` (default), `false` if you plan to copy a custom path manually
* `libPath`: optional custom source path used by the web UI to copy into the app's data dir when `defaultLib` is `false`

---

## Example `module.prop`

Place this at module root so Magisk/KernelSU can detect the module:

```ini
id=nepmodslibloader
name=NepMods Lib Loader
version=1.0.0
versionCode=1
author=Arjun (nepmods)
description=Dynamic library injector via Zygisk with web-based config UI

```

---


## Web UI (Usage)

1. Deploy the web UI into a web view provided by KernelSU or host it locally and open it via the KernelSU WebUI panel.
2. Ensure `webroot/main.js` points to the correct `CONFIG_FILE` path.
3. Add package names, toggle `Enable Load Lib`, choose `defaultLib` or a custom `libPath`, then `Save Config`.
4. If `defaultLib` is false and you provide a `libPath`, the UI will attempt to copy the specified `.so` into `/data/user/0/<package>/libmain.so` and chmod it to be executable.
5. Use `Backup` / `Restore` in the UI to manage global config backups.

---

## Debugging & Logs

View device logs to check the module actions:

```bash
adb logcat | grep NepLibLoader
```

Look for messages like:

```
I/NepLibLoader: detect game: com.example.app1
I/NepLibLoader: System.load("/data/user/0/com.example.app1/libmain.so") succeeded
```

---

## Troubleshooting

* **Config not loading**: verify `CONFIG_FILE` in `webroot/main.js` and permissions on the `config.json` file.
* **Library not loaded**: ensure `libmain.so` exists at `/data/user/0/<pkg>/libmain.so` and has appropriate permission (`chmod 755` or `777` for testing).
* **Permission denied on copy**: the web UI uses `exec()` (KernelSU) — ensure KernelSU has required permissions and the path is writable.

---

## Security & Legal Considerations

This tool can inject code into arbitrary applications. Use responsibly and only with apps you own or have explicit permission to modify. The author is not responsible for misuse.

---

## License

Choose a license and place it in `LICENSE`. Example: MIT.

---

## References

*[https://github.com/Perfare/Zygisk-Il2CppDumper](https://github.com/Perfare/Zygisk-Il2CppDumper)

---

## Credits

*[Arjun (nepmods)](https://github.com/nepmods)

---

If you distribute this project publicly, consider adding build badges, CI, and an example release zip that contains `module.prop`, `config.json` template, and prebuilt `.so` for supported ABIs.
