// themehub CLI — talks to any /api/v1 themehub instance.
//
// `themehub login` saves a hub URL + API token under XDG config.
// `themehub search <query>` lists matching themes.
// `themehub install <slug>` downloads and extracts the latest version.
// `themehub list` shows themes already extracted into the local install root.

use anyhow::{anyhow, bail, Context, Result};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};

const DEFAULT_HUB: &str = "https://hub.themehub.dev";

#[derive(Parser)]
#[command(name = "themehub", version, about = "Theme everything.")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,

    /// Override the hub URL for this command (e.g. http://localhost:3000).
    #[arg(long, global = true)]
    hub: Option<String>,
}

#[derive(Subcommand)]
enum Cmd {
    /// Save credentials for a hub. With no flags, prompts interactively.
    Login {
        /// API token (skip the prompt).
        #[arg(long)]
        token: Option<String>,

        /// Just print the active config, don't change anything.
        #[arg(long)]
        check: bool,
    },

    /// Search themes on the hub.
    Search {
        /// Free-text query.
        query: Vec<String>,

        /// Filter by theme type (e.g. grub, ventoy, gtk).
        #[arg(long)]
        r#type: Option<String>,

        /// Filter by tag.
        #[arg(long)]
        tag: Option<String>,

        /// Limit number of results.
        #[arg(long, default_value_t = 20)]
        limit: u32,
    },

    /// Show details for a theme.
    Show {
        /// Slug of the theme.
        slug: String,
    },

    /// Download and install a theme.
    Install {
        /// Slug of the theme.
        slug: String,

        /// Override the install target.
        #[arg(long)]
        target: Option<PathBuf>,

        /// Specific version (defaults to latest).
        #[arg(long)]
        version: Option<String>,

        /// Skip the prompt to confirm the install target.
        #[arg(short = 'y', long)]
        yes: bool,
    },

    /// List installed themes (whatever lives under the local install root).
    List,

    /// Print where each theme type is installed by default.
    Categories,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let cfg = Config::load()?;

    let hub = cli
        .hub
        .clone()
        .or_else(|| cfg.hub.clone())
        .unwrap_or_else(|| DEFAULT_HUB.to_string());

    match cli.cmd {
        Cmd::Login { token, check } => login(&hub, token, check),
        Cmd::Search {
            query,
            r#type,
            tag,
            limit,
        } => search(
            &hub,
            &query.join(" "),
            r#type.as_deref(),
            tag.as_deref(),
            limit,
        ),
        Cmd::Show { slug } => show(&hub, &slug),
        Cmd::Install {
            slug,
            target,
            version,
            yes,
        } => install(&hub, &slug, target, version.as_deref(), yes),
        Cmd::List => list_installed(),
        Cmd::Categories => print_categories(&hub),
    }
}

// ---------- config ----------

#[derive(Debug, Default, Serialize, Deserialize)]
struct Config {
    hub: Option<String>,
    token: Option<String>,
}

impl Config {
    fn path() -> Result<PathBuf> {
        let base = dirs::config_dir().ok_or_else(|| anyhow!("could not resolve config dir"))?;
        Ok(base.join("themehub").join("config.toml"))
    }

    fn load() -> Result<Self> {
        let p = Self::path()?;
        if !p.exists() {
            return Ok(Self::default());
        }
        let txt = fs::read_to_string(&p).with_context(|| format!("reading {}", p.display()))?;
        Ok(toml::from_str(&txt).unwrap_or_default())
    }

    fn save(&self) -> Result<()> {
        let p = Self::path()?;
        if let Some(parent) = p.parent() {
            fs::create_dir_all(parent)?;
        }
        let txt = toml::to_string_pretty(self)?;
        fs::write(&p, txt)?;
        Ok(())
    }
}

// ---------- commands ----------

fn login(hub: &str, token: Option<String>, check: bool) -> Result<()> {
    let mut cfg = Config::load()?;
    if check {
        println!("hub:   {}", cfg.hub.as_deref().unwrap_or(DEFAULT_HUB));
        match cfg.token.as_deref() {
            Some(t) => println!("token: {}***", &t[..t.len().min(6)]),
            None => println!("token: (none)"),
        }
        return Ok(());
    }
    cfg.hub = Some(hub.to_string());
    let token = match token {
        Some(t) => t,
        None => {
            print!("API token (generate at {hub}/settings/tokens): ");
            io::stdout().flush()?;
            let mut s = String::new();
            io::stdin().read_line(&mut s)?;
            s.trim().to_string()
        }
    };
    if token.is_empty() {
        bail!("token cannot be empty");
    }
    // Validate the token by hitting /api/v1/me.
    let client = http_client(&token)?;
    let resp = client
        .get(format!("{hub}/api/v1/me"))
        .send()
        .with_context(|| "calling /api/v1/me")?;
    if !resp.status().is_success() {
        bail!("token rejected by {hub}: {}", resp.status());
    }
    let me: serde_json::Value = resp.json()?;
    cfg.token = Some(token);
    cfg.save()?;
    println!(
        "Logged in to {hub} as @{}",
        me.get("username").and_then(|v| v.as_str()).unwrap_or("?")
    );
    Ok(())
}

fn search(hub: &str, q: &str, type_: Option<&str>, tag: Option<&str>, limit: u32) -> Result<()> {
    let client = anon_client()?;
    let mut url = format!("{hub}/api/v1/themes?limit={limit}");
    if !q.is_empty() {
        url.push_str(&format!("&q={}", urlencode(q)));
    }
    if let Some(t) = type_ {
        url.push_str(&format!("&type={}", urlencode(t)));
    }
    if let Some(t) = tag {
        url.push_str(&format!("&tag={}", urlencode(t)));
    }
    let resp: ThemeListResponse = client.get(&url).send()?.error_for_status()?.json()?;
    if resp.themes.is_empty() {
        println!("No themes match.");
        return Ok(());
    }
    for t in resp.themes {
        let rating = match t.rating {
            Some(r) => format!("{:.1}★", r),
            None => "—".to_string(),
        };
        println!(
            "{:<32} {:<14} {} dl  {}  by @{}",
            t.slug,
            t.r#type,
            t.downloads,
            rating,
            t.author.unwrap_or_else(|| "?".into()),
        );
        if !t.description.is_empty() {
            println!("    {}", first_line(&t.description));
        }
    }
    Ok(())
}

fn show(hub: &str, slug: &str) -> Result<()> {
    let client = anon_client()?;
    let url = format!("{hub}/api/v1/themes/{slug}");
    let detail: ThemeDetail = client.get(&url).send()?.error_for_status()?.json()?;
    println!("{} ({})", detail.name, detail.slug);
    println!("type:    {}", detail.r#type);
    if let Some(v) = &detail.latest_version {
        println!("latest:  {v}");
    }
    println!("license: {}", detail.license);
    println!("by:      @{}", detail.author.unwrap_or_else(|| "?".into()));
    if !detail.tags.is_empty() {
        println!("tags:    {}", detail.tags.join(", "));
    }
    println!();
    println!("{}", detail.description);
    Ok(())
}

fn install(
    hub: &str,
    slug: &str,
    target: Option<PathBuf>,
    version: Option<&str>,
    yes: bool,
) -> Result<()> {
    let client = anon_client()?;
    let url = format!("{hub}/api/v1/themes/{slug}");
    let detail: ThemeDetail = client.get(&url).send()?.error_for_status()?.json()?;
    let resolved_version = version
        .map(|s| s.to_string())
        .or(detail.latest_version.clone())
        .ok_or_else(|| anyhow!("theme {slug} has no published version"))?;
    let final_target = target.unwrap_or_else(|| resolve_target(&detail));

    if !yes {
        println!(
            "About to install {}@{} to {}",
            detail.slug,
            resolved_version,
            final_target.display()
        );
        print!("Proceed? [Y/n] ");
        io::stdout().flush()?;
        let mut s = String::new();
        io::stdin().read_line(&mut s)?;
        let trimmed = s.trim().to_lowercase();
        if !trimmed.is_empty() && trimmed != "y" && trimmed != "yes" {
            bail!("install cancelled");
        }
    }

    let archive_url = format!("{hub}/api/v1/themes/{slug}/versions/{resolved_version}/archive");
    println!("Downloading {archive_url}");
    let mut resp = client.get(&archive_url).send()?.error_for_status()?;
    let mut bytes: Vec<u8> = Vec::new();
    resp.read_to_end(&mut bytes)?;

    fs::create_dir_all(&final_target)
        .with_context(|| format!("could not create {}", final_target.display()))?;
    let reader = io::Cursor::new(bytes);
    let mut zip = zip::ZipArchive::new(reader)?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let outpath = final_target.join(
            entry
                .enclosed_name()
                .ok_or_else(|| anyhow!("unsafe entry in archive"))?,
        );
        if entry.is_dir() {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut out = fs::File::create(&outpath)?;
            io::copy(&mut entry, &mut out)?;
        }
    }
    println!(
        "Installed {}@{} to {}",
        detail.slug,
        resolved_version,
        final_target.display()
    );
    Ok(())
}

fn resolve_target(detail: &ThemeDetail) -> PathBuf {
    let raw = detail
        .manifest
        .as_ref()
        .and_then(|m| m.get("install"))
        .and_then(|i| i.get("target"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| default_target_for(&detail.r#type, &detail.slug));
    let home = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .display()
        .to_string();
    PathBuf::from(raw.replace("{home}", &home).replace("{slug}", &detail.slug))
}

fn default_target_for(theme_type: &str, slug: &str) -> String {
    match theme_type {
        "grub" => format!("/boot/grub/themes/{slug}"),
        "refind" => format!("/boot/EFI/refind/themes/{slug}"),
        "systemd-boot" => format!("/boot/loader/themes/{slug}"),
        "ventoy" => format!("{{home}}/ventoy/themes/{slug}"),
        "plymouth" => format!("/usr/share/plymouth/themes/{slug}"),
        "sddm" => format!("/usr/share/sddm/themes/{slug}"),
        "gdm" => format!("/usr/share/gnome-shell/theme/{slug}"),
        "gtk" => format!("{{home}}/.themes/{slug}"),
        "kde-plasma" => {
            format!("{{home}}/.local/share/plasma/desktoptheme/{slug}")
        }
        "icon" | "cursor" => format!("{{home}}/.icons/{slug}"),
        "wallpaper" => format!("{{home}}/Pictures/Wallpapers/{slug}"),
        "terminal" => format!("{{home}}/.config/themehub/terminal/{slug}"),
        "vscode" => format!("{{home}}/.vscode/extensions/{slug}"),
        "sticker" => format!("{{home}}/Pictures/Stickers/{slug}"),
        _ => format!("{{home}}/.local/share/themehub/{slug}"),
    }
}

fn list_installed() -> Result<()> {
    let root = dirs::data_local_dir()
        .ok_or_else(|| anyhow!("no data dir"))?
        .join("themehub");
    if !root.exists() {
        println!("No themes installed under {}.", root.display());
        return Ok(());
    }
    walk_first_level(&root)?;
    Ok(())
}

fn walk_first_level(root: &Path) -> Result<()> {
    for entry in fs::read_dir(root)? {
        let e = entry?;
        if e.file_type()?.is_dir() {
            println!("{}", e.path().display());
        }
    }
    Ok(())
}

fn print_categories(hub: &str) -> Result<()> {
    let client = anon_client()?;
    let url = format!("{hub}/api/v1/categories");
    let v: serde_json::Value = client.get(&url).send()?.error_for_status()?.json()?;
    if let Some(cats) = v.get("categories").and_then(|x| x.as_array()) {
        for c in cats {
            println!(
                "{:<14} {} — {}",
                c.get("type").and_then(|x| x.as_str()).unwrap_or("?"),
                c.get("label").and_then(|x| x.as_str()).unwrap_or("?"),
                c.get("blurb").and_then(|x| x.as_str()).unwrap_or(""),
            );
        }
    }
    Ok(())
}

// ---------- shared types ----------

#[derive(Debug, Deserialize)]
struct ThemeListResponse {
    themes: Vec<ThemeListItem>,
}

#[derive(Debug, Deserialize)]
struct ThemeListItem {
    slug: String,
    r#type: String,
    description: String,
    rating: Option<f64>,
    downloads: u64,
    author: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ThemeDetail {
    slug: String,
    name: String,
    r#type: String,
    description: String,
    license: String,
    tags: Vec<String>,
    author: Option<String>,
    #[serde(rename = "latestVersion")]
    latest_version: Option<String>,
    manifest: Option<serde_json::Value>,
}

// ---------- helpers ----------

fn anon_client() -> Result<reqwest::blocking::Client> {
    reqwest::blocking::Client::builder()
        .user_agent(format!("themehub/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(Into::into)
}

fn http_client(token: &str) -> Result<reqwest::blocking::Client> {
    use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
    let mut h = HeaderMap::new();
    h.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {token}"))?,
    );
    reqwest::blocking::Client::builder()
        .default_headers(h)
        .user_agent(format!("themehub/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(Into::into)
}

fn urlencode(s: &str) -> String {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') {
                (b as char).to_string()
            } else {
                format!("%{:02X}", b)
            }
        })
        .collect()
}

fn first_line(s: &str) -> &str {
    s.lines().next().unwrap_or(s)
}
