"""Generate the PWA / home-screen icons: a gauge on the signal-orange accent."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).resolve().parents[1] / "app" / "public"
BG, FG = "#c2410c", "#fff6ea"


def icon(px: int, scale: float, name: str) -> None:
    """scale < 1 keeps the artwork inside the maskable safe zone."""
    fig = plt.figure(figsize=(px / 100, px / 100), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-1, 1)
    ax.set_ylim(-1, 1)
    ax.axis("off")
    fig.patch.set_facecolor(BG)
    r = 0.56 * scale
    theta = np.linspace(np.pi, 0, 200)
    ax.plot(r * np.cos(theta), r * np.sin(theta) - 0.18 * scale, color=FG, lw=px / 14 * scale,
            solid_capstyle="round", alpha=0.35)
    t2 = np.linspace(np.pi, np.pi * 0.28, 120)
    ax.plot(r * np.cos(t2), r * np.sin(t2) - 0.18 * scale, color=FG, lw=px / 14 * scale, solid_capstyle="round")
    ang = np.pi * 0.28
    ax.plot([0, 0.42 * scale * np.cos(ang)], [-0.18 * scale, -0.18 * scale + 0.42 * scale * np.sin(ang)],
            color=FG, lw=px / 40 * scale, solid_capstyle="round")
    ax.scatter([0], [-0.18 * scale], s=(px / 9 * scale) ** 2 / 4, color=FG, zorder=3)
    fig.savefig(OUT / name, facecolor=BG)
    plt.close(fig)


if __name__ == "__main__":
    icon(192, 1.0, "icon-192.png")
    icon(512, 1.0, "icon-512.png")
    icon(512, 0.78, "icon-maskable-512.png")
    icon(180, 0.9, "apple-touch-icon.png")
    print("icons written to", OUT)
