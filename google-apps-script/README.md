# Google Apps Script Files

Copy these files to your Google Apps Script project:

1. Go to https://script.google.com
2. Create new project named "SessionSync"
3. Copy each file from the concatenated artifact:
   - **Code.gs** - Main script
   - **Settings.html** - Settings dialog
   - **About.html** - About dialog
   - **appsscript.json** - Manifest

## Deployment

1. Save all files
2. Run `onInstall` function once
3. Deploy → Test deployments → Editor Add-on
4. Select a Google Sheet to test

The add-on will appear under Extensions → SessionSync
