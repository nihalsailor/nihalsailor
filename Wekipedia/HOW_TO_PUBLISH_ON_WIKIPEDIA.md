# 📖 Guide: How to Publish on Wikipedia & Wikimedia Commons

This guide explains how Wikipedia works, what your screenshot is showing, and the step-by-step instructions to get your content live safely without getting deleted.

---

## ⚠️ 1. Important: What Your Screenshot Shows

In your screenshot, you have **Wikimedia Commons (Upload Wizard)** open with your username **`Developer42`**:

* **Wikimedia Commons** (`commons.wikimedia.org`) is a media repository. It is **only for images, audio, and video files** licensed under Creative Commons or Public Domain. You **cannot** paste or upload article text here.
* **Wikipedia** (`en.wikipedia.org`) is the actual encyclopedia where written articles live.

However, you will use **both**! You will upload your photo on Commons first, and then create your page on Wikipedia.

---

## 📸 Step 1: Upload Your Photo to Wikimedia Commons
*(Since you already have this screen open!)*

1. On the **Upload Wizard** screen from your screenshot:
   * Click the blue button: **"Select media files to share"**.
   * Pick your portrait photo or `MainLogo.jpg` from `C:\Developments\Nihalsailor\`.
2. Click **"Continue"**.
3. Under **Release rights**:
   * Select **"This file is my own work"**.
   * Confirm the Creative Commons license: **CC BY-SA 4.0** (required by Wikipedia).
4. Under **Describe**:
   * **Title:** Enter a descriptive file name, e.g., `Nihal_Sailor_Portrait.jpg`.
   * **Description:** "Portrait of software developer and game creator Nihal Sailor."
   * **Category:** Type and select `Software engineers from India` or `People of India`.
5. Click **"Publish files"**.
   * Note down the exact filename you gave it (e.g., `File:Nihal_Sailor_Portrait.jpg`). You can now embed this photo on Wikipedia!

---

## 🚀 Step 2: Choose How You Want to Publish on Wikipedia

There are two distinct ways to publish your presence on Wikipedia:

| Method | Target Location | Approval Process | Deletion Risk | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: User Profile Page** | `User:Developer42` | **Instant** (No review needed) | **Zero** (Safe) | Introducing yourself, your skills & fleet |
| **Option B: Public Encyclopedia Article** | `Draft:Nihal Sailor` | Reviewed by Wikipedia AfC editors | High if lacking secondary news press | Official Wikipedia encyclopedia article |

---

### Option A (Recommended): Create Your Official User Page (`User:Developer42`)

Every registered Wikipedia user has their own official personal page. Wikipedia allows you to describe who you are, what projects you develop, and your skills on your User Page!

1. Go to: **[https://en.wikipedia.org/wiki/User:Developer42](https://en.wikipedia.org/wiki/User:Developer42)**
2. Make sure you are logged in as **Developer42**.
3. Click the **"Create"** or **"Edit"** tab at the top right of the page.
4. Open the file **`User_Page_Developer42.wiki`** (located in this folder).
5. Copy all the text and paste it into the editor box on Wikipedia.
6. Under **Edit summary**, type: *"Initial user page profile"*.
7. Click **"Publish changes"**.
   * 🎉 **Result:** Your official page on Wikipedia is immediately live at `https://en.wikipedia.org/wiki/User:Developer42`!

---

### Option B: Submit a Public Encyclopedia Article (`Draft:Nihal Sailor`)

Wikipedia has strict community policies for standalone encyclopedia articles:
1. **WP:GNG & WP:BIO (Notability Guidelines):** Wikipedia requires that the subject has received significant, in-depth coverage in **reliable, independent secondary sources** (e.g. newspapers, tech journalism magazines, published interviews, verified press articles). Self-published portfolios, personal websites, and GitHub repositories are primary sources.
2. **WP:COI (Conflict of Interest):** Creating an article about yourself is considered a Conflict of Interest. If you publish it directly into the public encyclopedia space, it is likely to be marked for speedy deletion under **CSD A7 / G11**.

#### The Proper Way to Submit:
Use Wikipedia's **Articles for Creation (AfC)** system:

1. Log into your account on Wikipedia: **[https://en.wikipedia.org](https://en.wikipedia.org)**
2. In the search box, search for: `Draft:Nihal Sailor`
3. Click **"Start the Draft:Nihal Sailor page"** (or use the [Wikipedia Article Wizard](https://en.wikipedia.org/wiki/Wikipedia:Article_wizard)).
4. Open the file **`Nihal_Sailor_Article.wiki`** inside this folder:
   * Replace the image name `Nihal_Sailor_Portrait.jpg` with the exact filename you uploaded to Wikimedia Commons in Step 1.
   * If you have any news articles, tech blog features, or independent reviews of your games/software, add them to the references `<ref>` tags.
5. Copy all the wikitext from `Nihal_Sailor_Article.wiki` and paste it into the draft editor.
6. At the very top of the text, add:
   ```wikitext
   {{subst:submit}}
   ```
7. Click **"Publish changes"**.
8. A submission box will appear stating that your draft is queued for review by independent Wikipedia editors.

---

## 📂 Files Included in This Folder (`C:\Developments\Nihalsailor\Wekipedia`)

1. **`Nihal_Sailor_Article.wiki`**:
   The full encyclopedia article draft written in standard Wikipedia Wikitext markup (including Infobox, career history, software tables, and citations).
2. **`User_Page_Developer42.wiki`**:
   The profile wikitext ready to paste into `User:Developer42` on Wikipedia.
3. **`Wikipedia_Preview.html`**:
   An offline interactive HTML preview styled like Wikipedia. Double-click this file to open it in Chrome, Edge, or Brave and see how your Wikipedia article looks in real life!
4. **`HOW_TO_PUBLISH_ON_WIKIPEDIA.md`**:
   This complete publishing guide.
