-- Paw WezTerm colour scheme. require() from your wezterm.lua:
--   config.color_scheme_dirs = { wezterm.home_dir .. "/.config/wezterm/themes/paw-wezterm" }
--   config.color_scheme = "Paw"
return {
  colors = {
    foreground = "#f5e9f5",
    background = "#1a1720",
    cursor_bg = "#ff4fb2",
    cursor_fg = "#1a1720",
    cursor_border = "#ff4fb2",
    selection_fg = "#1a1720",
    selection_bg = "#b24dff",
    ansi = { "#2a2530","#ff6b8a","#8aff7a","#ffcb6b","#82aaff","#c792ea","#89ddff","#cfc5e0" },
    brights = { "#5b4d66","#ff9caf","#b6ffa6","#ffe08a","#a9c5ff","#e5b5ff","#b5ecff","#f5e9f5" },
  },
  metadata = { name = "Paw", author = "NightHawk" },
}
