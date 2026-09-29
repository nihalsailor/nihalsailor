<div align="center">

  <img src="BackgroundLogo.png" alt="Nihalsailor Flagship Banner" width="100%" style="border-radius: 8px;" />

  # ⚓ NIHALSAILOR
  ### Captain of the Digital Seas • Game Developer & Ethical Hacker

  [![Live Website](https://img.shields.io/badge/Live_Site-nihalsailor.github.io-gold?style=for-the-badge&logo=compass&logoColor=black)](https://nihalsailor.github.io/nihalsailor/)
  [![GitHub](https://img.shields.io/badge/GitHub-nihalsailor-181717?style=for-the-badge&logo=github)](https://github.com/nihalsailor)
  [![Instagram](https://img.shields.io/badge/Instagram-@nihalsailor-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/nihalsailor)
  [![Email](https://img.shields.io/badge/Dispatch-nihalsailor14@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:nihalsailor14@gmail.com)

  <p>
    <em>"The sea rewards only those who hold the helm when the sky burns."</em>
  </p>

</div>

---

## 🏴‍☠️ About Captain Nihalsailor

Welcome to the official repository and flagship website of **Nihalsailor**. 

- 🎮 **Passions:** Game Development (Unity 3D / Unreal / WebGL), Ethical Hacking & Systems Security.
- ⚡ **Core Craft:** Engineering resilient multiplayer games, distributed systems, and atmospheric dark-fantasy web experiences.
- 🌐 **Live Website:** [**https://nihalsailor.github.io/nihalsailor/**](https://nihalsailor.github.io/nihalsailor/)

---

## 🚢 The Armada (Featured Projects)

| Vessel / Project | Focus Area | Tech Stack |
| :--- | :--- | :--- |
| **WRX Battles Online** | Multiplayer Combat Warfare | Unity 3D, C#, Photon, PhysX |
| **ApaniBaat** | Real-Time Encrypted Messaging | Full-Stack, WebSockets, Node.js, React |
| **StreamSailor Suite** | Creator Broadcast Deck & DSP | Python, OBS WebSockets, Audio DSP |
| **ZAI Security Radar** | Ethical Hacking & Recon | Python, Network Security, Docker |
| **Parental Control Shield** | Security & Policy Enforcement | Android, C#, Local Firewall, SQLite |
| **Ghost Galleon 3D** | Browser Ocean Simulator | Three.js, GLSL Shaders, WebAudio |

---

## ➕ How to Add Your Projects (Showcase to Everyone)

You have **two effortless ways** to add your projects so the whole world can see them:

### Method 1: Directly on the Live Website (Visual & Instant)
1. Open the website: [**https://nihalsailor.github.io/nihalsailor/**](https://nihalsailor.github.io/nihalsailor/) (or `localhost:3000`).
2. Scroll to **The Armada** section and click the green button: **`➕ Commission New Vessel`**.
3. Fill in your project name, description, tags, and links, or upload a screenshot.
4. Click **`Commission & Preview Live`** — your project appears instantly in the showcase!
5. In the export window that pops up, click **`Download projects.json`** or **`Copy JSON`**.
6. Replace the content of `data/projects.json` in this repository and run `git push origin main` to publish it to everyone!

### Method 2: Edit `data/projects.json` Directly
Open `data/projects.json` and add your new project object to the array:

```json
{
  "id": "my-epic-game",
  "title": "My Epic Game",
  "category": "game",
  "categoryLabel": "Game Dev & 3D",
  "image": "BackgroundLogo.png",
  "desc": "A brief 1-2 sentence description of your game.",
  "details": "Full details, features, and lore for the inspection modal.",
  "tags": ["Unity", "C#", "Multiplayer"],
  "metrics": [
    { "label": "Engine", "val": "Unity" },
    { "label": "Status", "val": "Released" }
  ],
  "liveUrl": "https://yourgame.com",
  "codeUrl": "https://github.com/nihalsailor/my-epic-game"
}
```

Save and commit:
```bash
git add data/projects.json
git commit -m "Add My Epic Game to Armada showcase"
git push origin main
```
The website will automatically update via GitHub Actions!

---

## 🛠️ Local Development & Exploration

Run the local server:
```bash
node server.js
```
or open `index.html` directly in any web browser.

---

<div align="center">
  <sub>© 2026 Nihalsailor • Charting Uncharted Digital Horizons</sub>
</div>
