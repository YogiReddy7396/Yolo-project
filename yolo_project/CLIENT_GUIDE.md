# 🚀 Project Installation & Run Guide
**For Macintosh / Linux / Windows**

Follow these steps exactly to run the Garbage Detection AI App.

---

## 🏗️ 1. Prerequisites (Install these first)
1.  **Node.js**: [Download Here](https://nodejs.org/) (Install the LTS version)
2.  **Python**: [Download Here](https://www.python.org/downloads/) (Version 3.10 or newer)
    *   *Windows Users*: Check the box **"Add Python to PATH"** in the installer.

---

## 📦 2. Installation Commands

**Step A: Open Terminal / Command Prompt**
Navigate to the project folder:
```bash
cd /path/to/yolo_project
```

**Step B: Install AI Dependencies**
Copy and paste this command:
```bash
pip install -r requirements.txt
```
*(If that fails on Mac/Linux, try `pip3 install -r requirements.txt`)*

**Step C: Install Website Backend**
Move to the server directory and install packages:
```bash
cd web_app/server
npm install
```

---

## ▶️ 3. Running the App

**Step A: Start the Server**
Make sure you are inside `web_app/server`:
```bash
node server.js
```
You should see:
> `Server running on http://localhost:3000`
> `Database synced successfully.`

**Step B: Open in Browser**
Go to: **http://localhost:3000**

---

## 🛡️ 4. Admin Features (Optional)
*   **Sign Up**: The **first user** you create becomes the Admin.
*   **Database Reset**: If you need to wipe all data, log in as Admin, go to Admin Dashboard, and click **"Reset Database"** at the bottom.

---

## ❓ Troubleshooting Common Errors

**Error: "Cannot find module 'cors'" (or similar)**
*   **Fix**: You forgot to install Node packages. Run this:
    ```bash
    cd web_app/server
    npm install
    ```

**Error: "Python process exited..."**
*   **Fix**: You might not have installed the Python requirements.
    ```bash
    cd /path/to/yolo_project
    pip install -r requirements.txt
    ```

**Error: "bcrypt_lib.node Not Opened" (macOS Security Alert)**
*   **Reason**: You likely copied the `node_modules` folder from another computer. macOS blocks "foreign" code files.
*   **Fix**: You must reinstall the libraries on YOUR computer.
    1.  Go to `web_app/server` folder.
    2.  Delete the `node_modules` folder.
    3.  Run: `npm install`
    4.  Run: `node server.js`

**Error: No Bounding Boxes on Image**
*   **Check**: Ensure `inference.py` is using the correct model path. This is already configured, but ensure `notebooks/runs/best.pt` exists.

---
**Good Luck! ♻️**
