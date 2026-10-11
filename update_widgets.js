/**
 * DSA Widgets Catalog Scanner & Generator (Node.js version)
 * Scans the current directory for HTML widgets (strictly READ-ONLY),
 * categorizes them, and updates widgets-data.js.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CATEGORY_DEFS = [
  {
    category: "Complexity & Analysis",
    icon: "⏱️",
    color: "#6ea8dd",
    title_keywords: [
      /\bcomplexity\b/i, /\bbig[-_\s]?o\b/i, /\basymptotics?\b/i,
      /\bspeed[-_\s]matters?\b/i, /\bruntime\b/i, /\bgrowth[-_\s]rate\b/i,
      /\btime[-_\s]complexity\b/i, /\bwhy[-_\s]speed\b/i, /\blinear[-_\s]vs\b/i
    ],
    content_keywords: [
      /\bupper bound\b/i, /\bomega\b/i, /\btheta\b/i, /\bo\(n\)/i,
      /\bo\(1\)/i, /\bo\(log\s*n\)/i, /\boperations\b/i, /\bpolynomial\b/i,
      /\blogarithmic\b/i, /\blinear\s+scan\b/i, /\bbinary\s+search\b/i
    ]
  },
  {
    category: "Memory & Architecture",
    icon: "🧠",
    color: "#3f8f84",
    title_keywords: [
      /\bmalloc\b/i, /\bcalloc\b/i, /\bdynamic[-_\s]memory\b/i,
      /\bheap\b/i, /\bstack[-_\s]memory\b/i, /\bpointer[-_\s]walkthrough\b/i,
      /\ballocation\b/i, /\bmemory[-_\s]layout\b/i
    ],
    content_keywords: [
      /\bstack zone\b/i, /\bheap zone\b/i, /\bsizeof\b/i, /\bstruct\s+node\b/i,
      /\baddress\b/i, /\bdynamic memory\b/i, /\bzone-heap\b/i, /\bzone-stack\b/i
    ]
  },
  {
    category: "Linked Lists",
    icon: "🔗",
    color: "#c89b3c",
    title_keywords: [
      /\blinked[-_\s]list\b/i, /\bdummy[-_\s]node\b/i, /\bmiddle[-_\s]of\b/i,
      /\bkth[-_\s]from[-_\s]end\b/i, /\bsingly\b/i, /\bdoubly\b/i,
      /\breverse[-_\s]list\b/i, /\bslow[-_\s]fast\b/i, /\btortoise\b/i
    ],
    content_keywords: [
      /head->next/i, /\bdummy node\b/i, /\bslow pointer\b/i,
      /\bfast pointer\b/i, /node->next/i, /curr->next/i
    ]
  },
  {
    category: "Searching & Sorting",
    icon: "⚡",
    color: "#e07a5f",
    title_keywords: [
      /\bbinary[-_\s]search\b/i, /\blinear[-_\s]search\b/i,
      /\bquick[-_\s]*sort\b/i, /\bmerge[-_\s]*sort\b/i,
      /\bbubble[-_\s]*sort\b/i, /\binsertion[-_\s]*sort\b/i, /\bselection[-_\s]*sort\b/i,
      /\bheap[-_\s]*sort\b/i, /\bradix[-_\s]*sort\b/i, /\bcounting[-_\s]*sort\b/i,
      /\bquicksort\b/i, /\bmergesort\b/i, /\bheapsort\b/i, /\bbubblesort\b/i,
      /\bsorting\b/i, /\bsort\b/i
    ],
    content_keywords: [
      /\bpivot element\b/i, /\bpartition\b/i, /\bmidpoint\b/i,
      /\bsorted array\b/i, /\bdivide and conquer\b/i,
      /\bmerge sort\b/i, /\bquick sort\b/i, /\bsub-array\b/i, /\bsubarray\b/i, /\bmerging\b/i
    ]
  },
  {
    category: "Trees & Graphs",
    icon: "🌲",
    color: "#81b29a",
    title_keywords: [
      /\bbinary[-_\s]tree\b/i, /\bbst\b/i, /\bgraph\b/i, /\bbfs\b/i, /\bdfs\b/i,
      /\btree[-_\s]traversal\b/i, /\bdijkstra\b/i, /\bavl[-_\s]tree\b/i,
      /\btrie\b/i, /\bdirected[-_\s]graph\b/i
    ],
    content_keywords: [
      /\broot node\b/i, /\bleft child\b/i, /\bright child\b/i,
      /\badjacency list\b/i, /\btree node\b/i, /\bvertex\b/i, /\bedges\b/i
    ]
  },
  {
    category: "Stacks & Queues",
    icon: "🥞",
    color: "#f2cc8f",
    title_keywords: [
      /\bstack\b/i, /\bqueue\b/i, /\bfifo\b/i, /\blifo\b/i,
      /\bmonotonic[-_\s]stack\b/i, /\bdeque\b/i
    ],
    content_keywords: [
      /push\(/i, /pop\(/i, /\benqueue\b/i, /\bdequeue\b/i, /\btop of stack\b/i
    ]
  },
  {
    category: "Dynamic Programming",
    icon: "🧩",
    color: "#9d4edd",
    title_keywords: [
      /\bdynamic[-_\s]programming\b/i, /\bmemoization\b/i, /\btabulation\b/i,
      /\bknapsack\b/i, /\bsubsequence\b/i, /\bdp[-_\s]/i
    ],
    content_keywords: [
      /memo\[/i, /dp\[/i, /\boverlapping subproblems\b/i, /\boptimal substructure\b/i
    ]
  }
];

const DEFAULT_CATEGORY = {
  category: "General DSA",
  icon: "📚",
  color: "#c89b3c"
};

function cleanHtmlText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetadata(filePath) {
  const filename = path.basename(filePath);
  let rawContent;
  try {
    rawContent = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return null;
  }

  const cleanedBody = cleanHtmlText(rawContent);

  // 1. Extract <title>
  let rawTitle = "";
  const titleMatch = rawContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    rawTitle = cleanHtmlText(titleMatch[1]);
  } else {
    const h1Match = rawContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      rawTitle = cleanHtmlText(h1Match[1]);
    } else {
      rawTitle = filename.replace('.html', '').replace(/[-_]/g, ' ');
    }
  }

  const titleParts = rawTitle.split(/\s*[—–]\s*|\s+-\s+/);
  const mainTitle = titleParts[0].trim();
  const subtitle = titleParts[1] ? titleParts[1].trim() : "";

  let h1Text = "";
  const h1Match = rawContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    h1Text = cleanHtmlText(h1Match[1]);
  }

  // 2. Extract stamp
  let stamp = "";
  const stampMatch = rawContent.match(/class=['"][^'"]*stamp[^'"]*['"][^>]*>([\s\S]*?)<\//i);
  if (stampMatch) {
    stamp = cleanHtmlText(stampMatch[1]);
  } else if (subtitle) {
    stamp = subtitle;
  }

  // 3. Category match
  const searchTargetTitle = `${filename} ${rawTitle} ${h1Text}`.toLowerCase();
  const searchTargetContent = cleanedBody.slice(0, 10000).toLowerCase();

  let bestCat = null;
  let bestScore = 0;

  for (const catDef of CATEGORY_DEFS) {
    let score = 0;
    for (const pat of catDef.title_keywords) {
      if (pat.test(searchTargetTitle)) score += 50;
    }
    for (const pat of catDef.content_keywords) {
      if (pat.test(searchTargetContent)) score += 15;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCat = catDef;
    }
  }

  if (!bestCat || bestScore === 0) {
    bestCat = DEFAULT_CATEGORY;
  }

  // 4. Description
  let description = "";
  const metaDesc = rawContent.match(/<meta\s+name=['"]description['"]\s+content=['"]([\s\S]*?)['"]/i);
  if (metaDesc) {
    description = cleanHtmlText(metaDesc[1]);
  }

  if (!description) {
    const pMatches = rawContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (const p of pMatches) {
      const cleaned = cleanHtmlText(p);
      if (cleaned.length > 28 && !cleaned.startsWith('Note:') && !cleaned.toLowerCase().includes('cookie')) {
        description = cleaned.slice(0, 200) + (cleaned.length > 200 ? '...' : '');
        break;
      }
    }
  }

  if (!description) {
    const fnLower = filename.toLowerCase();
    if (fnLower.includes('malloc')) {
      description = "Step-by-step visual exploration of allocating struct nodes in Heap vs Stack memory, pointer linking, and struct initialization.";
    } else if (fnLower.includes('middle')) {
      description = "Interactive visualization of the slow and fast pointer (Tortoise & Hare) algorithm to find the midpoint in a single pass.";
    } else if (fnLower.includes('delete-kth')) {
      description = "Visual demonstration of two-pointer offset window and sentinel dummy head nodes to safely remove the k-th node from the end.";
    } else if (fnLower.includes('speed-matters')) {
      description = "Interactive comparison comparing linear scan O(n) against binary search O(log n) efficiency on large datasets.";
    } else if (fnLower.includes('complexity')) {
      description = "Intuitive field report on Big-O upper bounds, Omega lower bounds, and Theta tight bounds with speed limit analogies.";
    } else {
      description = `Interactive visualizer and field study exploring ${mainTitle}.`;
    }
  }

  // 5. Tags
  const tags = new Set();
  tags.add(bestCat.category);

  const tagCandidates = [
    ["Two Pointers", [/two[-_\s]pointer/i, /slow\s*&\s*fast/i, /tortoise/i, /middle/i]],
    ["Dummy Node", [/dummy[-_\s]node/i, /sentinel/i, /dummy[-_\s]head/i]],
    ["Dynamic Memory", [/malloc/i, /heap/i, /calloc/i, /free/i]],
    ["Pointers", [/pointer/i, /dereference/i, /struct\s+node/i]],
    ["Big-O", [/big-o/i, /big\s*o/i, /asymptotic/i, /time\s*complexity/i]],
    ["Binary Search", [/binary[-_\s]*search/i]],
    ["Linear Search", [/linear[-_\s]*search/i, /linear\s+scan/i]],
    ["Sorting", [/quick[-_\s]*sort/i, /merge[-_\s]*sort/i, /bubble[-_\s]*sort/i, /insertion[-_\s]*sort/i, /selection[-_\s]*sort/i, /sorting/i, /\bsort\b/i]],
    ["Divide & Conquer", [/divide[-_\s]*and[-_\s]*conquer/i, /split\s*the\s*array/i, /merge[-_\s]*sort/i, /quick[-_\s]*sort/i]],
    ["Stack vs Heap", [/stack\s+zone/i, /heap\s+zone/i, /zone-stack/i]],
    ["Edge Cases", [/nullbox/i, /edge\s*case/i, /even-length/i, /odd-length/i]],
    ["Visual Sim", [/btnplay/i, /btnnext/i, /code-panel/i, /visualizer/i]]
  ];

  const combined = (searchTargetTitle + " " + searchTargetContent + " " + rawContent.slice(0, 4000)).toLowerCase();
  for (const [tagName, patterns] of tagCandidates) {
    if (patterns.some(p => p.test(combined))) {
      tags.add(tagName);
    }
  }

  const stat = fs.statSync(filePath);
  const lastModified = `${stat.mtime.toLocaleString('en-US', { month: 'short' })} ${stat.mtime.getDate()}, ${stat.mtime.getFullYear()}`;
  const sizeKb = Math.round((stat.size / 1024) * 10) / 10;
  const linesCount = rawContent.split(/\r?\n/).length - (rawContent.endsWith('\n') || rawContent.endsWith('\r') ? 1 : 0);
  const estimatedMinutes = linesCount < 300 ? 5 : (linesCount < 550 ? 10 : 15);

  return {
    id: filename.replace('.html', '').replace(/[^a-zA-Z0-9_-]/g, '_'),
    filename,
    title: mainTitle,
    subtitle: subtitle || h1Text,
    stamp: stamp || bestCat.category.toUpperCase(),
    category: bestCat.category,
    categoryIcon: bestCat.icon,
    categoryColor: bestCat.color,
    description,
    tags: Array.from(tags).sort().slice(0, 4),
    sizeKb,
    linesCount,
    estimatedMinutes,
    lastModified,
    timestamp: Math.floor(stat.mtimeMs / 1000)
  };
}

function scanAndGenerate() {
  const currentDir = __dirname;
  const widgetsSubfolder = path.join(currentDir, 'widgets');
  console.log(`Scanning directory (read-only): ${currentDir}`);

  const excluded = new Set(['index.html', 'dashboard.html', 'home.html', 'hub.html']);
  const htmlFiles = [];

  function findHtmlFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findHtmlFiles(fullPath));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html') && !excluded.has(entry.name.toLowerCase())) {
        results.push(fullPath);
      }
    }
    return results;
  }

  // 1. Scan widgets/ subfolder recursively if present
  if (fs.existsSync(widgetsSubfolder) && fs.statSync(widgetsSubfolder).isDirectory()) {
    htmlFiles.push(...findHtmlFiles(widgetsSubfolder));
  }

  // 2. Also scan root directory
  const rootFiles = fs.readdirSync(currentDir)
    .filter(f => f.endsWith('.html') && !excluded.has(f.toLowerCase()) && !f.startsWith('.'))
    .map(f => path.join(currentDir, f));

  for (const rf of rootFiles) {
    if (!htmlFiles.includes(rf)) {
      htmlFiles.push(rf);
    }
  }

  htmlFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  const widgets = [];
  for (const file of htmlFiles) {
    const meta = extractMetadata(file);
    if (meta) {
      meta.filename = path.relative(currentDir, file).replace(/\\/g, '/');

      // Determine subfolder if nested inside widgets/
      let subfolder = "";
      const relToWidgets = path.relative(widgetsSubfolder, file);
      if (!relToWidgets.startsWith('..') && !path.isAbsolute(relToWidgets)) {
        const parts = relToWidgets.split(path.sep);
        if (parts.length > 1) {
          subfolder = parts[0];
        }
      }
      meta.subfolder = subfolder;

      // Prefix id with subfolder slug to guarantee uniqueness across folders
      if (subfolder) {
        const folderSlug = subfolder.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        meta.id = `${folderSlug}_${meta.id}`;
      }

      widgets.push(meta);
      const subLabel = subfolder ? ` [Subfolder: ${subfolder}]` : '';
      console.log(`  + Indexed [${meta.category}]${subLabel}: ${meta.title} (${meta.filename})`);
    }
  }

  const outputJsPath = path.join(currentDir, 'widgets-data.js');

  // Check if data actually changed to avoid spurious timestamp-only commits
  let dataChanged = true;
  if (fs.existsSync(outputJsPath)) {
    try {
      const oldContent = fs.readFileSync(outputJsPath, 'utf8');
      const match = oldContent.match(/const\s+DSA_WIDGETS\s*=\s*(\[\s*[\s\S]*?\]);/);
      if (match) {
        const oldData = JSON.parse(match[1]);
        if (JSON.stringify(oldData) === JSON.stringify(widgets)) {
          dataChanged = false;
        }
      }
    } catch (err) {
      dataChanged = true;
    }
  }

  if (dataChanged) {
    const jsContent = `// DSA Interactive Hub - Widgets Data Manifest
// Generated on: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}
// DO NOT EDIT DIRECTLY: Run 'update_widgets.py' or 'update-widgets.bat' to re-index!

const DSA_WIDGETS = ${JSON.stringify(widgets, null, 2)};

if (typeof window !== 'undefined') {
  window.DSA_WIDGETS = DSA_WIDGETS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DSA_WIDGETS;
}
`;
    fs.writeFileSync(outputJsPath, jsContent, 'utf8');
    console.log(`\n=======================================================`);
    console.log(`  SUCCESS: ${widgets.length} widgets indexed into widgets-data.js!`);
    console.log(`=======================================================\n`);
  } else {
    console.log(`\n=======================================================`);
    console.log(`  INDEX UP-TO-DATE: ${widgets.length} widgets unchanged in widgets-data.js.`);
    console.log(`=======================================================\n`);
  }

  return widgets;
}

function syncToGithub(widgets, currentDir = __dirname) {
  const gitDir = path.join(currentDir, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log('[GIT] No .git directory found. Skipping GitHub sync.');
    return false;
  }

  const gitCheck = spawnSync('git', ['--version'], { cwd: currentDir, encoding: 'utf8' });
  if (gitCheck.error || gitCheck.status !== 0) {
    console.log("[GIT WARNING] 'git' is not installed or not in your PATH. Skipping GitHub sync.");
    return false;
  }

  try {
    const statusProc = spawnSync('git', ['status', '--porcelain'], { cwd: currentDir, encoding: 'utf8' });
    if (statusProc.error) throw statusProc.error;
    const statusOutput = (statusProc.stdout || '').trim();
    if (!statusOutput) {
      console.log('[GIT] Working tree is clean. No changes to commit or push.');
      return true;
    }

    const widgetMap = {};
    for (const w of widgets) {
      const rel = (w.filename || '').replace(/\\/g, '/');
      const base = path.basename(rel);
      widgetMap[rel] = w;
      widgetMap[base] = w;
    }

    // Stage all changes
    const addProc = spawnSync('git', ['add', '-A'], { cwd: currentDir, encoding: 'utf8' });
    if (addProc.status !== 0) {
      throw new Error(addProc.stderr || 'git add failed');
    }

    // Inspect staged changes
    const diffProc = spawnSync('git', ['diff', '--cached', '--name-status'], { cwd: currentDir, encoding: 'utf8' });
    if (diffProc.error) throw diffProc.error;

    const stagedLines = (diffProc.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    if (!stagedLines.length) {
      console.log('[GIT] No staged changes found.');
      return true;
    }

    const excludedFiles = new Set(['index.html', 'dashboard.html', 'home.html', 'hub.html']);
    const newWidgets = [];
    const updatedWidgets = [];
    const deletedWidgets = [];
    const otherFiles = [];

    for (const line of stagedLines) {
      const tabs = line.split('\t');
      let statusCode = '';
      let fileRel = '';
      if (tabs.length >= 2) {
        statusCode = tabs[0];
        fileRel = (statusCode.startsWith('R') && tabs.length >= 3 ? tabs[2] : tabs[1]).replace(/\\/g, '/');
      } else {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;
        statusCode = parts[0];
        fileRel = parts.slice(1).join(' ').replace(/\\/g, '/');
      }
      const fname = path.basename(fileRel);

      const isWidget = (fileRel.startsWith('widgets/') || fileRel.endsWith('.html')) && !excludedFiles.has(fname.toLowerCase());
      const meta = widgetMap[fileRel] || widgetMap[fname];
      const title = meta && meta.title ? meta.title : fname.replace('.html', '').replace(/[-_]/g, ' ');
      const category = meta && meta.category ? meta.category : '';

      if (isWidget) {
        if (statusCode.startsWith('A') || statusCode.startsWith('?')) {
          newWidgets.push({ title, file: fileRel, category });
        } else if (statusCode.startsWith('M')) {
          updatedWidgets.push({ title, file: fileRel, category });
        } else if (statusCode.startsWith('D')) {
          deletedWidgets.push({ title, file: fileRel, category });
        } else if (statusCode.startsWith('R')) {
          newWidgets.push({ title, file: fileRel, category });
        }
      } else {
        otherFiles.push({ file: fileRel, status: statusCode });
      }
    }

    // Check if ONLY widgets-data.js changed with no widget additions, edits, or other file changes
    if (!newWidgets.length && !updatedWidgets.length && !deletedWidgets.length) {
      const nonManifestOthers = otherFiles.filter(f => f.file !== 'widgets-data.js');
      if (!nonManifestOthers.length) {
        spawnSync('git', ['restore', '--staged', 'widgets-data.js'], { cwd: currentDir });
        spawnSync('git', ['restore', 'widgets-data.js'], { cwd: currentDir });
        console.log('[GIT] Working tree is clean. No widget additions or modifications to commit.');
        return true;
      }
    }

    let commitSubject = 'Update widgets catalog and manifest';
    if (newWidgets.length && !updatedWidgets.length) {
      if (newWidgets.length === 1) {
        commitSubject = `Add new widget: ${newWidgets[0].title}`;
      } else if (newWidgets.length <= 3) {
        commitSubject = `Add new widgets: ${newWidgets.map(w => w.title).join(', ')}`;
      } else {
        commitSubject = `Add ${newWidgets.length} new widgets (${newWidgets[0].title} and others)`;
      }
    } else if (newWidgets.length && updatedWidgets.length) {
      if (newWidgets.length === 1) {
        commitSubject = `Add ${newWidgets[0].title} and update existing visualizers`;
      } else {
        commitSubject = `Add ${newWidgets.length} new widgets and update catalog`;
      }
    } else if (updatedWidgets.length && !newWidgets.length) {
      if (updatedWidgets.length === 1) {
        commitSubject = `Update widget: ${updatedWidgets[0].title}`;
      } else {
        commitSubject = `Update widgets: ${updatedWidgets.slice(0, 3).map(w => w.title).join(', ')}`;
      }
    } else if (deletedWidgets.length) {
      commitSubject = `Remove widget: ${deletedWidgets[0].title}`;
    }

    const bodyLines = [];
    if (newWidgets.length) {
      bodyLines.push('New Additions:');
      for (const w of newWidgets) {
        const cat = w.category ? ` [${w.category}]` : '';
        bodyLines.push(`  + ${w.title}${cat} (${w.file})`);
      }
    }
    if (updatedWidgets.length) {
      bodyLines.push('Updated Widgets:');
      for (const w of updatedWidgets) {
        bodyLines.push(`  ~ ${w.title} (${w.file})`);
      }
    }
    if (deletedWidgets.length) {
      bodyLines.push('Removed Widgets:');
      for (const w of deletedWidgets) {
        bodyLines.push(`  - ${w.title} (${w.file})`);
      }
    }
    if (otherFiles.length) {
      bodyLines.push('Other Changed Files:');
      for (const of of otherFiles) {
        bodyLines.push(`  * ${of.file}`);
      }
    }

    const commitBody = bodyLines.join('\n');

    console.log(`=======================================================`);
    console.log(`  [GIT] Committing changes...`);
    console.log(`  Subject: ${commitSubject}`);
    console.log(`=======================================================`);

    const commitArgs = ['commit', '-m', commitSubject];
    if (commitBody) {
      commitArgs.push('-m', commitBody);
    }

    const commitProc = spawnSync('git', commitArgs, { cwd: currentDir, encoding: 'utf8' });
    if (commitProc.status !== 0) {
      throw new Error(commitProc.stderr || 'git commit failed');
    }
    console.log('[GIT] Changes successfully committed locally.');

    console.log('\n[GIT] Pushing commit to GitHub (origin)...');
    let pushProc = spawnSync('git', ['push'], { cwd: currentDir, encoding: 'utf8' });
    if (pushProc.status === 0) {
      console.log('=======================================================');
      console.log('  SUCCESS: Pushed to GitHub successfully!');
      console.log(`  Commit: "${commitSubject}"`);
      console.log('=======================================================\n');
      return true;
    } else {
      const errMsg = (pushProc.stderr || '').trim();
      const lower = errMsg.toLowerCase();
      if (lower.includes('fetch first') || lower.includes('rejected') || lower.includes('non-fast-forward')) {
        console.log("[GIT INFO] Remote has newer commits. Attempting 'git pull --rebase' before pushing...");
        const pullProc = spawnSync('git', ['pull', '--rebase'], { cwd: currentDir, encoding: 'utf8' });
        if (pullProc.status === 0) {
          pushProc = spawnSync('git', ['push'], { cwd: currentDir, encoding: 'utf8' });
          if (pushProc.status === 0) {
            console.log('=======================================================');
            console.log('  SUCCESS: Rebased and pushed to GitHub successfully!');
            console.log(`  Commit: "${commitSubject}"`);
            console.log('=======================================================\n');
            return true;
          }
        }
      }
      console.warn(`\n[GIT WARNING] Failed to push to GitHub: ${errMsg}`);
      console.log("[GIT INFO] Your changes have been committed locally. Run 'git push' when your connection is ready.");
      return false;
    }
  } catch (err) {
    console.warn(`\n[GIT ERROR] Sync failed: ${err.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const noPush = args.includes('--no-push');

  const widgets = scanAndGenerate();
  if (!noPush) {
    syncToGithub(widgets);
  }
}

if (require.main === module) {
  main();
}
