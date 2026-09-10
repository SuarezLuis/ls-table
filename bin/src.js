"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var prettierBytes = require("prettier-bytes");
var os = require("os");
var fs = require("fs");
var path = require("path");
var table_1 = require("table");
var HELP_TEXT = "Usage: lst [path] [options]\n\nList a directory's contents as a table (name + size).\nFolders are always listed before files.\n\nArguments:\n  path             Directory to list (default: current directory)\n\nOptions:\n  -a, --all        Include hidden files (dotfiles)\n  -l, --long       Show permissions and last modified time\n  -r, --reverse    Reverse the sort order\n  --sort <key>     Sort by \"name\" (default), \"size\", \"created\", or \"modified\"\n  --dirs-only      Only list folders\n  --files-only     Only list files\n  --no-color       Disable colored output\n  -h, --help       Show this help message and exit\n\nNote: --sort created relies on filesystem birthtime, which isn't\navailable on all platforms/filesystems (notably some Linux setups).";
var pad2 = function (n) { return String(n).padStart(2, "0"); };
var formatDate = function (date) {
    return "".concat(date.getFullYear(), "-").concat(pad2(date.getMonth() + 1), "-").concat(pad2(date.getDate()), " ").concat(pad2(date.getHours()), ":").concat(pad2(date.getMinutes()));
};
var EXTENSION_EMOJI = {
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
    "class": "☕",
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
    woff2: "🔤"
};
var getFileEmoji = function (filename) {
    if (filename === ".env" || filename.startsWith(".env.")) {
        return "🔐";
    }
    if (filename === "package-lock.json" || filename.endsWith(".lock")) {
        return "🔒";
    }
    var ext = path.extname(filename).slice(1).toLowerCase();
    return EXTENSION_EMOJI[ext] || "📄";
};
var formatPermissions = function (mode, isDirectory) {
    var rwx = function (bits) {
        return "".concat(bits & 4 ? "r" : "-").concat(bits & 2 ? "w" : "-").concat(bits & 1 ? "x" : "-");
    };
    var perms = mode & 511;
    return "".concat(isDirectory ? "d" : "-").concat(rwx((perms >> 6) & 7)).concat(rwx((perms >> 3) & 7)).concat(rwx(perms & 7));
};
var getRecursiveSize = function (dirPath) {
    var entries;
    try {
        entries = fs.readdirSync(dirPath);
    }
    catch (e) {
        return { bytes: 0, incomplete: true };
    }
    var bytes = 0;
    var incomplete = false;
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        var entryPath = "".concat(dirPath, "/").concat(entry);
        var stats = void 0;
        try {
            stats = fs.lstatSync(entryPath);
        }
        catch (e) {
            incomplete = true;
            continue;
        }
        if (stats.isSymbolicLink()) {
            continue;
        }
        if (stats.isDirectory()) {
            var nested = getRecursiveSize(entryPath);
            bytes += nested.bytes;
            incomplete = incomplete || nested.incomplete;
        }
        else {
            bytes += stats.size;
        }
    }
    return { bytes: bytes, incomplete: incomplete };
};
var main = function () {
    var args = process.argv.slice(2);
    if (args.includes("-h") || args.includes("--help")) {
        console.log(HELP_TEXT);
        return;
    }
    var pathInput;
    var showAll = false;
    var longFormat = false;
    var reverse = false;
    var noColor = !process.stdout.isTTY;
    var sortKey = "name";
    var filterType = "all";
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
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
                var value = args[++i];
                if (value === undefined) {
                    console.error('Missing value for --sort. Expected "name", "size", "created", or "modified".');
                    process.exit(1);
                }
                if (value !== "name" &&
                    value !== "size" &&
                    value !== "created" &&
                    value !== "modified") {
                    console.error("Invalid --sort value: ".concat(value, ". Expected \"name\", \"size\", \"created\", or \"modified\"."));
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
    var relativePath = path.resolve(process.cwd(), pathInput || process.cwd());
    var rawRead;
    try {
        rawRead = fs.readdirSync(relativePath);
    }
    catch (e) {
        if (typeof e === "string") {
            console.error(e);
        }
        else {
            var error = e;
            console.error(error.name, error.message);
        }
        process.exit(1);
    }
    var folders = [];
    var files = [];
    var hadIncompleteSize = false;
    for (var _i = 0, rawRead_1 = rawRead; _i < rawRead_1.length; _i++) {
        var item = rawRead_1[_i];
        if (!showAll && item.startsWith(".")) {
            continue;
        }
        var itemPath = "".concat(relativePath, "/").concat(item);
        var stats = void 0;
        try {
            stats = fs.statSync(itemPath);
        }
        catch (e) {
            files.push({
                rawName: item,
                name: "\u2753 ".concat(item),
                size: "?",
                sizeBytes: 0,
                mtimeMs: 0,
                birthtimeMs: 0,
                permissions: longFormat ? "?????????" : undefined,
                modified: longFormat ? "?" : undefined
            });
            continue;
        }
        var isFolder = stats.isDirectory();
        var sizeBytes = 0;
        var size = "0 B";
        if (isFolder) {
            if (filterType !== "files") {
                var recursive = getRecursiveSize(itemPath);
                sizeBytes = recursive.bytes;
                size = prettierBytes(sizeBytes) + (recursive.incomplete ? "+" : "");
                hadIncompleteSize = hadIncompleteSize || recursive.incomplete;
            }
        }
        else {
            sizeBytes = stats.size;
            size = prettierBytes(sizeBytes);
        }
        var entry = {
            rawName: item,
            name: isFolder ? "\uD83D\uDCC1 ".concat(item) : "".concat(getFileEmoji(item), " ").concat(item),
            size: size,
            sizeBytes: sizeBytes,
            mtimeMs: stats.mtimeMs,
            birthtimeMs: stats.birthtimeMs,
            permissions: longFormat ? formatPermissions(stats.mode, isFolder) : undefined,
            modified: longFormat ? formatDate(stats.mtime) : undefined
        };
        if (isFolder) {
            folders.push(entry);
        }
        else {
            files.push(entry);
        }
    }
    var sortFn = function (a, b) {
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
    var fullList = __spreadArray(__spreadArray([], (filterType === "files" ? [] : folders), true), (filterType === "dirs" ? [] : files), true);
    var tableHeader = longFormat
        ? ["Name", "Size", "Permissions", "Modified"]
        : ["Name", "Size"];
    var separatorRow = longFormat
        ? ["──────────────", "───────", "───────────", "───────────────"]
        : ["──────────────", "───────"];
    var tableInput = fullList.map(function (item) {
        return longFormat
            ? [item.name, item.size, item.permissions, item.modified]
            : [item.name, item.size];
    });
    var config = {
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
            ]
    };
    var tableOutput = (0, table_1.table)(__spreadArray([tableHeader, separatorRow], tableInput, true), config);
    var colorize = function (text, colorCode) {
        return noColor ? text : "\u001B[".concat(colorCode, "m").concat(text, "\u001B[0m");
    };
    console.log("\n".concat(colorize("\uD83D\uDCC2 ".concat(relativePath), "32"), "\n"));
    var totalSizeBytes = fullList.reduce(function (sum, item) { return sum + item.sizeBytes; }, 0);
    console.log(tableOutput);
    console.log("Total items:  ".concat(colorize(String(fullList.length), "33")));
    console.log("Total size:  ".concat(colorize(prettierBytes(totalSizeBytes) + (hadIncompleteSize ? "+" : ""), "33"), "\n"));
    if (hadIncompleteSize) {
        console.error("Note: sizes marked with + are incomplete — some subfolder contents couldn't be read (permission denied).");
    }
};
if (process.argv[3] == "--debug") {
    main();
}
exports["default"] = main;
