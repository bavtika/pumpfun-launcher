"""RunPod serverless handler: GPU vanity Solana address generation.

Input:  { "pattern": "pump", "match": "prefix" | "suffix" }
Output: { "address": "<base58>", "secretKey": "<base58 64-byte keypair>" }
        or { "error": "..." }

Grinding is done by SolVanityCL (OpenCL), which writes the found keypair as a
solana-cli style JSON file (64 bytes array) into the output dir.
"""

import glob
import json
import os
import re
import subprocess
import tempfile

import base58
import runpod

BASE58_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{1,6}$")
SOLVANITY_DIR = os.environ.get("SOLVANITY_DIR", "/app/solvanity")
# 6-char suffix on a weak GPU can take hours; cap via env, default 3h.
TIMEOUT_S = int(os.environ.get("WORKER_TIMEOUT_S", "10800"))


def handler(job):
    inp = job.get("input") or {}
    pattern = str(inp.get("pattern") or "").strip()
    match = inp.get("match", "prefix")

    if not BASE58_RE.match(pattern):
        return {"error": "Invalid pattern: 1-6 Base58 chars (no 0, O, I, l)"}
    if match not in ("prefix", "suffix"):
        return {"error": "match must be 'prefix' or 'suffix'"}

    outdir = tempfile.mkdtemp(prefix="vanity-")
    flag = "--starts-with" if match == "prefix" else "--ends-with"
    cmd = [
        "python3",
        os.path.join(SOLVANITY_DIR, "main.py"),
        "search-pubkey",
        flag,
        pattern,
        "--count",
        "1",
        "--output-dir",
        outdir,
    ]

    try:
        proc = subprocess.run(
            cmd, cwd=SOLVANITY_DIR, capture_output=True, text=True, timeout=TIMEOUT_S
        )
    except subprocess.TimeoutExpired:
        return {"error": f"Not found within {TIMEOUT_S // 3600}h limit — try a shorter pattern"}

    files = sorted(glob.glob(os.path.join(outdir, "*.json")))
    if not files:
        tail = (proc.stdout or proc.stderr or "").strip()[-300:]
        return {"error": f"Grinder produced no keypair. {tail}"}

    with open(files[0]) as f:
        secret = bytes(json.load(f))
    if len(secret) != 64:
        return {"error": "Malformed keypair file"}

    return {
        "address": base58.b58encode(secret[32:]).decode(),
        "secretKey": base58.b58encode(secret).decode(),
    }


runpod.serverless.start({"handler": handler})
