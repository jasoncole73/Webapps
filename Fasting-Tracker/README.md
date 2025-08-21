# Fasting Tracker (easy version)

This is a tiny website that helps you time your fasts.
It works on your computer or phone. Your data stays in your browser.

## What it can do
- Start a fast and see the timer
- Forgot to start? Pick a time in the past and start from there
- Show time **left** (countdown) or time **so far** (elapsed)
- Reminders for **water** and **electrolytes** (little pop-up messages)
- Color bar that changes for longer fasts (you can set the colors and hour marks)
- Save each fast to a list with notes
- See a simple 14‑day chart, your average time, and your streak
- Download your data as a CSV file

---

## Super simple setup (like a 5th grader)
Think of this folder as your project box called **Fasting Tracker**.

1. **Open a terminal** (Command Prompt on Windows, Terminal on Mac).
2. **Go into the folder** (the box).
   - Example: `cd "Fasting Tracker"`
3. **Install tools** (this puts the pieces together):
   ```bash
   npm install
   ```
4. **Run it** (this starts the website on your computer):
   ```bash
   npm run dev
   ```
   The terminal will show a link like `http://localhost:5173`. Click it!

---

## Put it on your GitHub website
Your GitHub is `github.com/jasoncole73/Webapps`. We will place this app **inside** that repo.

1. Open your **Webapps** folder on your computer.
2. Put the whole **Fasting Tracker** folder inside **Webapps**.
   It should look like: `Webapps/Fasting Tracker/...`
3. Open a terminal **inside** the `Webapps` folder and type:
   ```bash
   git add .
   git commit -m "Add Fasting Tracker app"
   git push
   ```
4. Go to **github.com/jasoncole73/Webapps → Settings → Pages**.
   - Under **Build and deployment**, choose **GitHub Actions**.
   - Use the Vite workflow it suggests (or accept the default).
5. Visit your site. The address will look like:
   - `https://jasoncole73.github.io/Webapps/Fasting%20Tracker/`

If you rename the folder, open `vite.config.js` and change the line:
```js
base: '/Webapps/Fasting%20Tracker/',
```
Make it match your new path.

---

## Tips
- To get desktop notifications, your browser may ask “Allow?” → Click **Allow**.
- If you change the hour marks or colors, the progress bar updates as your fast gets longer.
- Your data is in your browser only. To clear everything, click **Reset** (careful!).

Have fun!
