# ls-table

A CLI that lists a directory's contents as a table — folders first, human-readable sizes, and an emoji per file type.

<img width="874" height="729" alt="image" src="https://github.com/user-attachments/assets/f04c549e-d523-49fc-90da-df3b5eca4be9" />


## Install

```
npm install -g ls-table
```

Installs two equivalent commands: `ls-table` and `lst`.

## Usage

```
lst [path] [options]
```

Defaults to the current directory when no path is given. Hidden files are excluded unless `-a`/`--all` is passed. Folder sizes are computed recursively (their full contents, not just the directory entry itself), and the total at the bottom reflects whatever's currently listed after any filters.

An entry `lst` can't read (e.g. a broken symlink) shows up as `❓` with an unknown size instead of crashing the listing. A folder size followed by `+` (e.g. `4.1 MB+`) means part of that folder couldn't be read — usually a permissions issue — so the real size is at least that much.

## Options

| Option | Description |
| --- | --- |
| `-a`, `--all` | Include hidden files (dotfiles) |
| `-l`, `--long` | Show permissions and last modified time |
| `-r`, `--reverse` | Reverse the sort order |
| `--sort <key>` | Sort by `name` (default), `size`, `created`, or `modified` |
| `--dirs-only` | Only list folders |
| `--files-only` | Only list files |
| `--no-color` | Disable colored output |
| `-h`, `--help` | Show the help message and exit |

`--sort created` relies on filesystem birthtime, which isn't available on all platforms/filesystems (notably some Linux setups).

## Examples

```
lst                          # list the current directory
lst ~/Projects               # list a specific directory
lst -a                       # include hidden files
lst --sort size -r           # largest first
lst -l --sort modified       # recently changed first, with permissions/timestamps
lst --dirs-only              # folders only
```
