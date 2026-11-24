# ⚔️ LEGEND OF LUA

**A 2D Fantasy Adventure Browser Game**

Legend of Lua adalah game petualangan berbasis web yang menghadirkan pengalaman bermain dalam dunia fantasi. Pemain dapat menjelajahi map, menghadapi musuh, mengumpulkan emas, serta meningkatkan progres permainan melalui berbagai mekanisme gameplay.

---

## 🎮 Game Overview

| Information | Description |
|---|---|
| Game Name | Legend of Lua |
| Genre | Fantasy Adventure |
| Game Type | 2D Browser Game |
| Platform | Web Browser |
| Language | HTML, CSS, JavaScript |
| Rendering | 2D |
| Storage | Browser Local Storage |

## ✨ Features

- **2D Adventure Gameplay** – Eksplorasi dunia game dengan tampilan 2D.
- **Character Movement** – Menggerakkan karakter menggunakan keyboard.
- **Combat System** – Menyerang musuh menggunakan mekanisme pertarungan.
- **Roll Mechanic** – Menghindari serangan dengan fitur roll.
- **Fire Attack** – Menggunakan serangan api untuk menghadapi musuh.
- **Item System** – Mengganti dan menggunakan item selama permainan.
- **Gold Collection** – Mengumpulkan emas selama petualangan.
- **Progression System** – Menyimpan progres, emas, dan skor permainan.
- **Fullscreen Mode** – Mendukung mode layar penuh.

## 🕹️ Controls

| Key / Input | Function |
|---|---|
| W | Move Up |
| A | Move Left |
| S | Move Down |
| D | Move Right |
| Space | Roll |
| Left Click | Sword Attack |
| Shift + Left Click | Fire Attack |
| Tab | Change Item |
| Backspace | Fullscreen Mode |

## 🛠️ Technologies Used

- **HTML5** – Struktur utama game.
- **CSS3** – Styling dan tampilan antarmuka.
- **JavaScript** – Gameplay mechanics dan interaksi.
- **Local Storage** – Penyimpanan progres permainan di browser.

## 📂 Project Structure

```text
LEGEND-OF-LUA/
│
├── assets/
│   └── sprites/
│
├── css/
│
├── js/
│
├── tools/
│
├── dashboard.html
├── game.html
├── index.html
├── login.html
├── register.html
│
└── README.md
```

## 🚀 How to Run

Game perlu dijalankan melalui local server karena beberapa resource menggunakan mekanisme `fetch()`.

**1. Clone Repository**

```bash
git clone URL_REPOSITORY
```

**2. Masuk ke Folder Project**

```bash
cd LEGEND-OF-LUA
```

**3. Jalankan Local Server**

Pastikan Python sudah terinstall.

```bash
python -m http.server 8000
```

**4. Open Game**

Buka browser dan akses:

```text
http://localhost:8000/
```

Alternatifnya, kamu bisa menggunakan ekstensi Live Server di Visual Studio Code.

## 💾 Game Data

Legend of Lua menggunakan Browser Local Storage untuk menyimpan data permainan, termasuk:

- Player progress
- Collected gold
- Game score

Data tersimpan secara lokal pada browser yang digunakan.

## 🌐 Deployment

Game dapat di-hosting menggunakan layanan web hosting statis yang mendukung file HTML, CSS, dan JavaScript, seperti:

- GitHub Pages
- Vercel

Pastikan seluruh asset dan path file sudah sesuai sebelum deployment.

---

## 👨‍💻 Developer

**LEGEND OF LUA**

Developed as a web-based game project.

---

*Explore the world, defeat your enemies, collect treasures, and write your own adventure.* ⚔️
