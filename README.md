# Diamond Stars ⭐

A cartoon softball fielding game for early readers. Built as a Progressive Web App (PWA) so it installs on an iPad like a real app and works offline at the field.

**What it does:** Your daughter picks a fielding position, sees a play unfold (runners on bases, ball coming to her), and taps the base where she'd throw. The app teaches softball fielding strategy with simple language and celebrates correct throws with animations, stars, and confetti.

## What's inside

```
diamond-stars/
├── index.html            ← the app shell
├── styles.css            ← styling
├── app.js                ← game logic, sounds, progress saving
├── manifest.webmanifest  ← PWA install info
├── sw.js                 ← service worker for offline support
├── icons/                ← app icons (180, 192, 512, maskable)
└── README.md             ← this file
```

## Get it running on your Mac (test locally first)

Before pushing to GitHub, make sure it works on your machine:

1. Open Terminal
2. `cd` into the project folder, e.g. `cd ~/Downloads/diamond-stars`
3. Run a tiny local server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open `http://localhost:8000` in Chrome or Safari
5. You should see the game. Try a few plays.

Press `Ctrl+C` in Terminal to stop the server when done.

> Why a local server? Service workers (the offline magic) need to be served over HTTP, not opened as `file://`.

## Get it onto GitHub Pages (free hosting)

You have two paths — pick whichever is more comfortable. Both end at the same place: a URL you can open on your daughter's iPad.

### Path A: Web upload (no terminal needed)

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click **+ → New repository** in the top-right
3. Name it `diamond-stars` (or anything you like)
4. Set it to **Public**
5. Check **Add a README file**, then click **Create repository**
6. On the repo page, click **Add file → Upload files**
7. Drag every file and folder from your `diamond-stars` directory into the upload box. Make sure the `icons/` folder uploads as a folder (drag the whole folder, not its contents).
8. Scroll down, click **Commit changes**
9. Go to repo **Settings → Pages** (left sidebar)
10. Under **Source**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**
11. Wait a couple minutes. Your site URL appears at the top, like `https://YOUR-USERNAME.github.io/diamond-stars/`

### Path B: Terminal with git

```bash
cd ~/Downloads/diamond-stars            # or wherever the project lives
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Create the empty repo on github.com first (steps 1-5 above), skipping the README
git remote add origin https://github.com/YOUR-USERNAME/diamond-stars.git
git push -u origin main
```

Then go to repo **Settings → Pages → Deploy from a branch → main → / (root) → Save**. Wait a couple minutes, grab the URL.

## Put it on her iPad

1. On the iPad, open Safari (must be Safari — Chrome on iOS doesn't support PWA install)
2. Go to your GitHub Pages URL
3. Tap the **Share** button (square with up arrow) at the bottom
4. Scroll down and tap **Add to Home Screen**
5. The app icon appears with the name "Diamond Stars"
6. Tap the icon. It opens full-screen, just like a real app
7. Play once with WiFi on so the service worker can cache everything
8. From then on, it works **fully offline**, at the field, in the car, anywhere

## What works already

- ✅ Six fielding positions (Pitcher, Catcher, 1B, 2B, SS, 3B), each with its own teaching screen
- ✅ Easy / Hard difficulty toggle
- ✅ Random scenarios with runners and outs
- ✅ Animated ball throw along a curved path
- ✅ Confetti, stars, and "OUT!" celebration on correct throws
- ✅ Cheerful sound effects (no audio files needed — synthesized with Web Audio)
- ✅ Sound on/off toggle (her preference is saved)
- ✅ Stats: outs counter and current streak (saved between sessions)
- ✅ Remembered teaching state — once she's seen a position's lesson, she goes straight to scenarios next time
- ✅ Fully offline after first load
- ✅ Installable as a home-screen app on iPad

## Ideas to iterate on next

- More positions (outfield: LF, CF, RF) with their own scenarios
- A "lesson library" she can revisit
- More celebration variety (different animations on streaks)
- Spoken praise (recorded audio for "Great throw!")
- A "tournament" mode with rounds
- Custom characters she can pick (skin tone, ponytail color, jersey number)

## Updating the app later

When you want to make changes:

**Web path:** edit files locally → upload again on GitHub → it auto-deploys.

**Git path:**
```bash
# edit some files...
git add .
git commit -m "describe the change"
git push
```

Either way: bump the `CACHE_NAME` constant at the top of `sw.js` (e.g. `'diamond-stars-v1'` → `'diamond-stars-v2'`) whenever you change `index.html`, `styles.css`, or `app.js`. That forces the iPad to download the new version instead of serving the old cached one.

## Troubleshooting

**"Add to Home Screen" doesn't show up.** You must be in Safari, not Chrome or any other iOS browser.

**Changes don't appear after updating.** Bump the `CACHE_NAME` in `sw.js`, push the update, then on the iPad: delete the app from the home screen, clear Safari history, reinstall.

**Service worker not registering.** Open the URL in Safari (not file://), check the browser console for errors.

**GitHub Pages shows a blank page or 404.** Wait a full 2-3 minutes after enabling Pages. Make sure the source is set to `main` branch, `/ (root)`. Confirm `index.html` is in the repository root, not inside a subfolder.

---

Built with love for a future shortstop. 🥎
