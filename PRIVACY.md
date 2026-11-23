# Privacy Policy for Any Cloud

**Effective Date:** November 21, 2026  
**Last Updated:** November 21, 2026  

---

## 1. Introduction & Local-First Philosophy

**Any Cloud** ("the Application", "we", "us", or "our") is an open-source, local-first multi-cloud desktop management application built with Tauri 2, Rust, React, and Rclone. 

We strongly believe that your files, cloud storage accounts, credentials, and digital workflows belong exclusively to you. Any Cloud is architected from the ground up with a **Zero-Knowledge and Zero-Relay** principle:

* **No Intermediate Servers:** Any Cloud does **not** operate any proxy servers, cloud relays, or intermediary backend services. All cloud interactions occur directly between your personal device and your chosen cloud storage providers.
* **Local Data Sovereignty:** Your credentials, access tokens, folder structures, and file caches reside solely on your local computer's storage drive.
* **No Monetization of Personal Data:** We do not sell, rent, monetize, broker, or harvest your personal data, files, metadata, or activity logs.

---

## 2. Information Handled by the Application

### A. Cloud Storage Credentials & Access Keys
* **What We Store:** To connect to your cloud providers (e.g., Google Drive, Microsoft OneDrive, Amazon S3, Nextcloud, WebDAV, FTP, SFTP, Dropbox, Box, etc.), Any Cloud stores authentication tokens, API keys, usernames, passwords, or S3 access/secret key pairs.
* **Where It Is Stored:** All credentials are stored **strictly on your local machine** within your local SQLite database (`%APPDATA%/any-cloud/anycloud.db` on Windows, `~/.local/share/any-cloud/` on Linux, or `~/Library/Application Support/any-cloud/` on macOS) and your local Rclone configuration file.
* **Credential Isolation:** Credentials are never broadcast, mirrored, or uploaded to any third party or remote server operated by Any Cloud.

### B. OAuth 2.0 Direct Authentication
* For cloud services that support OAuth (such as Google Drive, Microsoft OneDrive, Box, and Dropbox), authentication occurs directly between your local default web browser and the provider's official login portal.
* The authentication callback is captured locally via a secure loopback redirect listener on your local machine (`http://127.0.0.1:<port>`) with PKCE (Proof Key for Code Exchange) and state verification.
* Any Cloud never sees your cloud provider password when using OAuth; only the authorized access and refresh tokens returned by the provider are saved locally.

### C. File Contents & Data Transfers
* **Direct Point-to-Point Transfers:** When you upload, download, or transfer files between clouds (cross-cloud transfer), data packets stream directly between your computer and the respective storage endpoints.
* **No File Inspection:** Any Cloud never inspects, scans, analyzes, indexes for advertising, or stores the contents of your files on external servers.
* **Temporary Transfer Buffers:** In-memory or temporary disk streaming buffers used during chunked transfers are discarded upon transfer completion.

### D. Local Metadata & Cache Database
* **Local Indexing:** To deliver high-speed folder browsing, offline capabilities, and instant full-text search (FTS5), Any Cloud caches file metadata (file names, sizes, MIME types, modification timestamps, and directory hierarchies) in a local SQLite database on your device.
* **User Control:** You retain full control over your local cache. You can manually refresh or wipe cached metadata at any time through **Preferences & Settings > Cache & Storage**.

---

## 3. Google API Services User Data Policy

Any Cloud's use and transfer of information received from Google APIs adhere to the **[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)**, including the **Limited Use** requirements:

1. Any Cloud only requests the minimum Google Drive scopes necessary to list, upload, download, and manage your Google Drive files as requested by you.
2. Google user data is never transferred to any external server or third party. All Google Drive API calls are executed locally from your computer directly to Google's official endpoints (`https://www.googleapis.com/`).
3. Google user data is not used for serving advertisements, training generalized artificial intelligence or machine learning models, or tracking your cross-site behavior.
4. Human review of your Google Drive files or metadata is not performed by Any Cloud maintainers or developers.

---

## 4. Microsoft Graph & OneDrive Data Policy

When connecting Microsoft OneDrive or SharePoint accounts:
1. Authentication is conducted directly through Microsoft's identity platform (`https://login.microsoftonline.com/`).
2. Any Cloud requests only the permissions required to read and write files on your OneDrive storage on your behalf.
3. No Microsoft user account information or documents are relayed through or stored on external servers.

---

## 5. Telemetry & Crash Reporting

Any Cloud values transparent and minimal telemetry:

* **Opt-In / Opt-Out Choice:** You can enable or disable anonymous crash reporting and telemetry at any time via **Preferences & Settings > Security & Privacy > Anonymous Telemetry & Crash Reporting**.
* **What Anonymous Telemetry Contains (If Enabled):**
  * Application version number (e.g., `v0.7.0`).
  * Operating system platform and architecture (e.g., `Windows 11 x86_64`).
  * Technical error stack traces or crash crash logs to diagnose stability issues.
* **What Telemetry NEVER Contains:**
  * File names, folder names, file contents, or directory paths.
  * Usernames, email addresses, passwords, API keys, or access tokens.
  * Cloud account identifiers or server hostnames/IP addresses.

---

## 6. Security Safeguards

We implement industry-standard software safeguards to protect your data locally:

1. **In-Memory Masking:** Sensitive inputs (secret keys, passwords, and tokens) are masked in the user interface by default with visibility toggles.
2. **Session Auto-Lock:** An optional desktop inactivity lock can be configured in Settings to require master verification before accessing the application interface.
3. **No Background Remote Daemons:** Any Cloud does not install any background web servers, open listening ports to the external internet, or install root certificates.
4. **Direct Process Execution:** The underlying Rclone synchronization engine is invoked directly via secure process argument arrays (without shell interpolation) to prevent command injection vulnerabilities.

---

## 7. Third-Party Services and Cloud Providers

When you use Any Cloud to access third-party cloud storage accounts (such as AWS, Google, Microsoft, Cloudflare, Backblaze, Dropbox, Mega, Infomaniak, etc.), your data is subject to the respective privacy policies, service terms, and data retention rules of those individual providers. 

We encourage you to review the privacy policies of the cloud storage services you connect to Any Cloud.

---

## 8. Your Data Rights & Deletion

Because all your data is stored locally on your device, you have complete authority over it:

* **Account Disconnection:** Clicking **Delete / Disconnect** on any connected account in the **Storage Accounts** tab immediately purges that account's credentials, configuration records, and associated cached file indexes from your local database.
* **Cache Purging:** You can purge local file caches, thumbnails, transfer logs, and search indexes at any time via **Preferences & Settings > Cache & Storage > Clear All Cache**.
* **Complete Erasure / Uninstall:** Uninstalling Any Cloud and deleting the local application directory (`%APPDATA%/any-cloud` on Windows) removes 100% of your data, configurations, and history from your computer.

---

## 9. Children's Privacy

Any Cloud is a general desktop productivity utility and is not directed at children under the age of 13 (or under 16 in the European Economic Area). We do not knowingly solicit or collect personal information from children.

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect new features, provider integrations, or regulatory requirements. Any modifications will be posted in this file within the official repository with an updated **Last Updated** revision date.

---

## 11. Open Source & Contact

Any Cloud is committed to open, verifiable software. You can inspect the source code, verify our network communication patterns, or report privacy inquiries:

* **Source Code Repository:** [GitHub - Any Cloud](https://github.com/sayandey021/Any-Cloud)
* **Maintainer:** Sayan Dey
* **GitHub Profile:** [https://github.com/sayandey021](https://github.com/sayandey021)
* **LinkedIn:** [https://www.linkedin.com/in/sayan-dey021](https://www.linkedin.com/in/sayan-dey021)
* **Issue Tracker:** [GitHub Issues](https://github.com/sayandey021/Any-Cloud/issues)
