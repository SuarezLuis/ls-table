var prettierBytes = require("prettier-bytes");
const os = require("os");
const fs = require("fs");
const path = require("path");

import { table, TableUserConfig } from "table";

const HELP_TEXT = `Usage: lst [path] [options]

List a directory's contents as a table (name + size).
Folders are always listed before files.

Arguments:
  path             Directory to list (default: current directory)

Options:
  -a, --all        Include hidden files (dotfiles)
  -l, --long       Show permissions and last modified time
  -r, --reverse    Reverse the sort order
  --sort <key>     Sort by "name" (default), "size", "created", or "modified"
  --dirs-only      Only list folders
  --files-only     Only list files
  --no-color       Disable colored output
  -h, --help       Show this help message and exit

Note: --sort created relies on filesystem birthtime, which isn't
available on all platforms/filesystems (notably some Linux setups).`;

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const EXTENSION_EMOJI: Record<string, string> = {
  png: "📷",
  jpg: "📷",
  jpeg: "📷",
  gif: "📷",
  webp: "📷",
  bmp: "📷",
  ico: "📷",
  svg: "🎨",
  mp4: "🎬",
  mov: "🎬",
  avi: "🎬",
  mkv: "🎬",
  webm: "🎬",
  mp3: "🎵",
  wav: "🎵",
  flac: "🎵",
  ogg: "🎵",
  m4a: "🎵",
  pdf: "📕",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  csv: "📊",
  ppt: "📈",
  pptx: "📈",
  md: "📝",
  mdx: "📝",
  zip: "📦",
  tar: "📦",
  gz: "📦",
  rar: "📦",
  "7z": "📦",
  json: "🧩",
  jsonc: "🧩",
  yml: "🧰",
  yaml: "🧰",
  toml: "🧰",
  js: "🟨",
  jsx: "🟨",
  mjs: "🟨",
  cjs: "🟨",
  ts: "🔷",
  tsx: "🔷",
  py: "🐍",
  rb: "💎",
  go: "🐹",
  rs: "🦀",
  java: "☕",
  class: "☕",
  jar: "☕",
  c: "🔧",
  cpp: "🔧",
  h: "🔧",
  hpp: "🔧",
  php: "🐘",
  swift: "🐦",
  sh: "🐚",
  bash: "🐚",
  zsh: "🐚",
  sql: "💾",
  html: "🌐",
  htm: "🌐",
  css: "🎨",
  scss: "🎨",
  less: "🎨",
  ttf: "🔤",
  otf: "🔤",
  woff: "🔤",
  woff2: "🔤",
};

const getFileEmoji = (filename: string): string => {
  if (filename === ".env" || filename.startsWith(".env.")) {
    return "🔐";
  }
  if (filename === "package-lock.json" || filename.endsWith(".lock")) {
    return "🔒";
  }
  const ext = path.extname(filename).slice(1).toLowerCase();
  return EXTENSION_EMOJI[ext] || "📄";
};

const formatPermissions = (mode: number, isDirectory: boolean): string => {
  const rwx = (bits: number) =>
    `${bits & 4 ? "r" : "-"}${bits & 2 ? "w" : "-"}${bits & 1 ? "x" : "-"}`;
  const perms = mode & 0o777;
  return `${isDirectory ? "d" : "-"}${rwx((perms >> 6) & 7)}${rwx(
    (perms >> 3) & 7
  )}${rwx(perms & 7)}`;
};

interface RecursiveSize {
  bytes: number;
  incomplete: boolean;
}

const getRecursiveSize = (dirPath: string): RecursiveSize => {
  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch (e) {
    return { bytes: 0, incomplete: true };
  }

  let bytes = 0;
  let incomplete = false;
  for (const entry of entries) {
    const entryPath = `${dirPath}/${entry}`;
    let stats;
    try {
      stats = fs.lstatSync(entryPath);
    } catch (e) {
      incomplete = true;
      continue;
    }
    if (stats.isSymbolicLink()) {
      continue;
    }
    if (stats.isDirectory()) {
      const nested = getRecursiveSize(entryPath);
      bytes += nested.bytes;
      incomplete = incomplete || nested.incomplete;
    } else {
      bytes += stats.size;
    }
  }
  return { bytes, incomplete };
};

const main = () => {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    console.log(HELP_TEXT);
    return;
  }

  let pathInput: string | undefined;
  let showAll = false;
  let longFormat = false;
  let reverse = false;
  let noColor = !process.stdout.isTTY;
  let sortKey: "name" | "size" | "created" | "modified" = "name";
  let filterType: "all" | "dirs" | "files" = "all";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-a":
      case "--all":
        showAll = true;
        break;
      case "-l":
      case "--long":
        longFormat = true;
        break;
      case "-r":
      case "--reverse":
        reverse = true;
        break;
      case "--no-color":
        noColor = true;
        break;
      case "--dirs-only":
        filterType = "dirs";
        break;
      case "--files-only":
        filterType = "files";
        break;
      case "--sort": {
        const value = args[++i];
        if (value === undefined) {
          console.error(
            'Missing value for --sort. Expected "name", "size", "created", or "modified".'
          );
          process.exit(1);
        }
        if (
          value !== "name" &&
          value !== "size" &&
          value !== "created" &&
          value !== "modified"
        ) {
          console.error(
            `Invalid --sort value: ${value}. Expected "name", "size", "created", or "modified".`
          );
          process.exit(1);
        }
        sortKey = value;
        break;
      }
      default:
        if (!arg.startsWith("-") && pathInput === undefined) {
          pathInput = arg;
        }
        break;
    }
  }

  const relativePath = path.resolve(process.cwd(), pathInput || process.cwd());
  let rawRead: string[];
  try {
    rawRead = fs.readdirSync(relativePath);
  } catch (e) {
    if (typeof e === "string") {
      console.error(e);
    } else {
      const error = e as Error;
      console.error(error.name, error.message);
    }
    process.exit(1);
  }
  interface Item {
    rawName: string;
    name: string;
    size: string;
    sizeBytes: number;
    mtimeMs: number;
    birthtimeMs: number;
    permissions?: string;
    modified?: string;
  }

  let folders: Item[] = [];
  let files: Item[] = [];
  let hadIncompleteSize = false;

  for (const item of rawRead) {
    if (!showAll && item.startsWith(".")) {
      continue;
    }

    const itemPath = `${relativePath}/${item}`;
    let stats;
    try {
      stats = fs.statSync(itemPath);
    } catch (e) {
      files.push({
        rawName: item,
        name: `❓ ${item}`,
        size: "?",
        sizeBytes: 0,
        mtimeMs: 0,
        birthtimeMs: 0,
        permissions: longFormat ? "?????????" : undefined,
        modified: longFormat ? "?" : undefined,
      });
      continue;
    }
    const isFolder = stats.isDirectory();

    let sizeBytes = 0;
    let size = "0 B";
    if (isFolder) {
      if (filterType !== "files") {
        const recursive = getRecursiveSize(itemPath);
        sizeBytes = recursive.bytes;
        size = prettierBytes(sizeBytes) + (recursive.incomplete ? "+" : "");
        hadIncompleteSize = hadIncompleteSize || recursive.incomplete;
      }
    } else {
      sizeBytes = stats.size;
      size = prettierBytes(sizeBytes);
    }

    const entry: Item = {
      rawName: item,
      name: isFolder ? `📁 ${item}` : `${getFileEmoji(item)} ${item}`,
      size,
      sizeBytes,
      mtimeMs: stats.mtimeMs,
      birthtimeMs: stats.birthtimeMs,
      permissions: longFormat ? formatPermissions(stats.mode, isFolder) : undefined,
      modified: longFormat ? formatDate(stats.mtime) : undefined,
    };

    if (isFolder) {
      folders.push(entry);
    } else {
      files.push(entry);
    }
  }

  const sortFn = (a: Item, b: Item) => {
    switch (sortKey) {
      case "size":
        return a.sizeBytes - b.sizeBytes;
      case "created":
        return a.birthtimeMs - b.birthtimeMs;
      case "modified":
        return a.mtimeMs - b.mtimeMs;
      default:
        return a.rawName.localeCompare(b.rawName);
    }
  };

  folders.sort(sortFn);
  files.sort(sortFn);

  if (reverse) {
    folders.reverse();
    files.reverse();
  }

  const fullList = [
    ...(filterType === "files" ? [] : folders),
    ...(filterType === "dirs" ? [] : files),
  ];

  const tableHeader = longFormat
    ? ["Name", "Size", "Permissions", "Modified"]
    : ["Name", "Size"];

  const separatorRow = longFormat
    ? ["──────────────", "───────", "───────────", "───────────────"]
    : ["──────────────", "───────"];

  const tableInput = fullList.map((item) =>
    longFormat
      ? [item.name, item.size, item.permissions, item.modified]
      : [item.name, item.size]
  );

  const config: TableUserConfig = {
    singleLine: true,
    columns: longFormat
      ? [
          { alignment: "left", verticalAlignment: "middle" },
          { alignment: "right" },
          { alignment: "left" },
          { alignment: "left" },
        ]
      : [
          { alignment: "left", verticalAlignment: "middle" },
          { alignment: "right" },
        ],
  };

  const tableOutput = table([tableHeader, separatorRow, ...tableInput], config);

  const colorize = (text: string, colorCode: string) =>
    noColor ? text : `\x1b[${colorCode}m${text}\x1b[0m`;

  console.log(`\n${colorize(`📂 ${relativePath}`, "32")}\n`);

  const totalSizeBytes = fullList.reduce((sum, item) => sum + item.sizeBytes, 0);

  console.log(tableOutput);
  console.log(`Total items:  ${colorize(String(fullList.length), "33")}`);
  console.log(
    `Total size:  ${colorize(
      prettierBytes(totalSizeBytes) + (hadIncompleteSize ? "+" : ""),
      "33"
    )}\n`
  );

  if (hadIncompleteSize) {
    console.error(
      "Note: sizes marked with + are incomplete — some subfolder contents couldn't be read (permission denied)."
    );
  }
};

if (process.argv[3] == "--debug") {
  main();
}

export default main;
