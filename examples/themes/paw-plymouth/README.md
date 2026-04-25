# Paw Plymouth

```
sudo cp -r paw-plymouth /usr/share/plymouth/themes/
sudo plymouth-set-default-theme -R paw-plymouth
```

The provided frames are SVG for preview purposes. Convert to PNG with
`rsvg-convert frame-001.svg -o frame-001.png` (or Plymouth will not render
them — the script expects PNGs at runtime).
