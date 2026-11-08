from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SOURCE = ROOT / "Kosaa Logo.png"

source = Image.open(SOURCE).convert("RGB")

# App icon: the original deep-black brand tile, kept opaque for iOS.
icon = source.resize((1024, 1024), Image.LANCZOS)
icon.save(ASSETS / "icon.png", optimize=True)

# Adaptive icon foreground: full brand tile on its own black background.
# The near-black tile blends into the adaptive background while keeping the
# mint glow intact.
foreground = source.resize((1024, 1024), Image.LANCZOS)
foreground.save(ASSETS / "android-icon-foreground.png", optimize=True)

background = Image.new("RGB", (1024, 1024), (10, 10, 10))
background.save(ASSETS / "android-icon-background.png", optimize=True)

# Splash art has the same near-black backdrop as the splash screen.
splash = source.resize((640, 640), Image.LANCZOS)
splash.save(ASSETS / "splash-icon.png", optimize=True)

favicon = source.resize((64, 64), Image.LANCZOS)
favicon.save(ASSETS / "favicon.png", optimize=True)

print("icons generated from", SOURCE.name, source.size)
