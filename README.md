# 🎓 Data Structures & Algorithms Interactive Study Hub
### Course Visualizer Laboratory • Curated by Dr. Binayak Dutta

A centralized, interactive study hub hosting Data Structures & Algorithms conceptual visualizers and interactive lab widgets shared by **Dr. Binayak Dutta**, built for deep conceptual study, exam preparation, and seamless navigation.

---

## 🚀 Quick Start

- **Open the Study Hub**: Double-click **`index.html`** in your browser.
- **Sync Widgets**: Double-click **`update-widgets.bat`** (scans the `widgets/` folder and updates your catalog).

---

## ⚡ Adding New Widgets from Dr. Binayak Dutta

Whenever Dr. Binayak Dutta shares a new visualizer or algorithm widget:

1. **Save the File**: Copy or drop the new `.html` file into the **`widgets/`** subfolder.
2. **Sync**: Double-click **`update-widgets.bat`** (or run `python update_widgets.py` / `node update_widgets.js`).
3. **Done**: The script automatically:
   - Reads the new file in **strictly read-only mode** (your widget files are never edited or modified).
   - Identifies the topic and classifies it into its appropriate DSA category.
   - Generates tags, descriptions, and updates `widgets-data.js`.

*(This system is fully automated and self-sustaining — you never need to manually edit code, data files, or documentation when new widgets are added.)*

---

## ✨ Features & Architecture

- **Dedicated `widgets/` Directory**: Keeps all visualizer files isolated and organized in their own subfolder away from hub configuration files.
- **Left Sidebar Category Navigation**: Automatically groups visualizers by topic with icons and live counters. Scales effortlessly to any number of topics introduced throughout the semester.
- **Compact & Dense Cards Grid**: Space-efficient cards with tight padding and 2-line clamped descriptions, allowing you to view multiple visualizers on screen at once.
- **View Modes**: Switch between **Grid View (`⊞`)** and **List View (`☰`)**.
- **Quick Preview Modal**: Click **"Preview 👁️"** to interact with any widget in an embedded in-page window without losing your place.
- **Direct Tab Launch**: Click **"Launch ↗"** to open any visualizer full-screen in a dedicated browser tab.
- **Strictly Read-Only on Widgets**: All widget files remain 100% untouched and preserved in their original state.
- **Instant Live Search**: Press `/` or type in the search bar to filter by title, description, code concepts (e.g., `two-pointer`, `malloc`, `big-o`, `tree`), or tags.
- **Zero Configuration**: Runs 100% locally via standard `file:///` protocol in any browser (Chrome, Edge, Firefox, Brave, Safari) with no local web server required.

---

## 🛠️ Automation Scripts

- **`update-widgets.bat`**: Double-clickable Windows batch runner that scans `widgets/` and updates the catalog.
- **`update_widgets.py`**: Python read-only scanner & classifier engine (recommended).
- **`update_widgets.js`**: Node.js read-only alternative scanner.
