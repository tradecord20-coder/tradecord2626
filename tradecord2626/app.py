"""Compatibility entrypoint for the consolidated TradeCore Flask app."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import app, configured_port  # noqa: E402


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=configured_port(), debug=False, use_reloader=False)