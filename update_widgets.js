/**
 * DSA Widgets Catalog Scanner & Generator (Node.js version)
 * Scans the current directory for HTML widgets (strictly READ-ONLY),
 * categorizes them, and updates widgets-data.js.
 */

const fs = require('fs');
const path = require('path');

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
      /\bbinary[-_\s]search\b/i, /\blinear[-_\s]search\b/i, /\bquicksort\b/i,
      /\bmergesort\b/i, /\bbubble[-_\s]sort\b/i, /\binsertion[-_\s]sort\b/i,
      /\bselection[-_\s]sort\b/i, /\bsorting\b/i
    ],
    content_keywords: [
      /\bpivot element\b/i, /\bpartition\b/i, /\bmidpoint\b/i,
      /\bsorted array\b/i, /\bdivide and conquer\b/i
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
    ["Binary Search", [/binary[-_\s]search/i, /log\s*n/i]],
    ["Linear Search", [/linear[-_\s]search/i, /linear\s+scan/i]],
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
  const lastModified = stat.mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const sizeKb = Math.round((stat.size / 1024) * 10) / 10;
  const linesCount = rawContent.split(/\r?\n/).length;
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

  // 1. Scan widgets/ subfolder first if present
  if (fs.existsSync(widgetsSubfolder) && fs.statSync(widgetsSubfolder).isDirectory()) {
    const subFiles = fs.readdirSync(widgetsSubfolder)
      .filter(f => f.endsWith('.html') && !excluded.has(f.toLowerCase()) && !f.startsWith('.'))
      .map(f => path.join(widgetsSubfolder, f));
    htmlFiles.push(...subFiles);
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
      widgets.push(meta);
      console.log(`  + Indexed [${meta.category}]: ${meta.title} (${meta.filename})`);
    }
  }

  const outputJsPath = path.join(currentDir, 'widgets-data.js');
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
  return widgets;
}

if (require.main === module) {
  scanAndGenerate();
}
