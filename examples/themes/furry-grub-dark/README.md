# Furry GRUB Dark

A moody dark GRUB theme with violet accents and (placeholder) paw-print
artwork. Drop the unzipped folder into `/boot/grub/themes/`, then add:

```
GRUB_THEME="/boot/grub/themes/furry-grub-dark/theme.txt"
```

to `/etc/default/grub` and run `update-grub` (or your distro's equivalent).

## Customising

- Replace `background.png` with a 1920×1080 PNG of your choice (kept dark for
  legibility).
- Tweak colours in `theme.txt` — accent is `#a78bfa`, backdrop is `#0a0a14`.
- Drop `select_c.png`, `select_e.png`, `select_w.png` etc. to override the
  selection ring around menu items.
