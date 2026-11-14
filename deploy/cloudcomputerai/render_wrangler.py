#!/usr/bin/env python3
"""Render a per-instance wrangler config for the Zero backend from upstream's
`apps/server/wrangler.jsonc` production env.

Every Cloudflare resource name is derived from the instance slug, so each
cloudcomputerai customer gets isolated Workers, queues, buckets, KV and
indexes. Resource IDs (KV, Hyperdrive) come from the instance state file
written by provisioning.

Usage:
  render_wrangler.py <instance.env> <state.json> <out.json>
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
UPSTREAM = ROOT / "apps/server/wrangler.jsonc"


def load_jsonc(path):
    text = path.read_text()
    text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return json.loads(text)


def load_env(path):
    out = {}
    for line in pathlib.Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def names(slug):
    p = f"ccai-email-{slug}"
    return {
        "server": f"{p}-server",
        "web": f"{p}-web",
        "thread_queue": f"{p}-thread",
        "subscribe_queue": f"{p}-subscribe",
        "bucket": f"{p}-threads",
        "vec_threads": f"{p}-threads-vec",
        "vec_messages": f"{p}-messages-vec",
        "kv": {
            "prompts_storage": f"{p}-prompts",
            "gmail_sub_age": f"{p}-gmail-sub-age",
            "snoozed_emails": f"{p}-snoozed",
        },
        "hyperdrive": f"{p}-pg",
    }


def render(inst, state):
    up = load_jsonc(UPSTREAM)
    prod = up["env"]["production"]
    n = names(inst["CUSTOMER_SLUG"])
    app_url = f"https://{inst['APP_HOST']}"
    api_url = f"https://{inst['API_HOST']}"

    cfg = {
        "name": n["server"],
        "main": str(ROOT / up["main"].replace("src/", "apps/server/src/", 1)),
        "compatibility_date": up["compatibility_date"],
        "compatibility_flags": up.get("compatibility_flags", []),
        "routes": [{"pattern": inst["API_HOST"], "custom_domain": True}],
        "triggers": prod["triggers"],
        "observability": prod.get("observability", {"enabled": True}),
        "ai": prod["ai"],
        "durable_objects": prod["durable_objects"],
        "migrations": prod["migrations"],
        "r2_buckets": [{"binding": "THREADS_BUCKET", "bucket_name": n["bucket"]}],
        "vectorize": [
            {"binding": "VECTORIZE", "index_name": n["vec_threads"]},
            {"binding": "VECTORIZE_MESSAGE", "index_name": n["vec_messages"]},
        ],
        "queues": {
            "producers": [
                {"queue": n["thread_queue"], "binding": "thread_queue"},
                {"queue": n["subscribe_queue"], "binding": "subscribe_queue"},
            ],
            "consumers": [
                {"queue": n["subscribe_queue"]},
                {"queue": n["thread_queue"]},
            ],
        },
        "hyperdrive": [
            {"binding": "HYPERDRIVE", "id": state.get("hyperdrive_id", "00000000000000000000000000000000")}
        ],
        "kv_namespaces": [
            {"binding": b, "id": state.get("kv", {}).get(b, "00000000000000000000000000000000")}
            for b in n["kv"]
        ],
        "vars": {
            **prod["vars"],
            "COOKIE_DOMAIN": inst["COOKIE_DOMAIN"],
            "VITE_PUBLIC_BACKEND_URL": api_url,
            "VITE_PUBLIC_APP_URL": app_url,
            "BETTER_AUTH_URL": api_url,
        },
    }
    # Upstream bindings we did not map would silently go missing; fail loudly.
    known = {"routes", "triggers", "observability", "ai", "durable_objects", "migrations",
             "r2_buckets", "vectorize", "queues", "hyperdrive", "kv_namespaces", "vars"}
    extra = set(prod) - known
    if extra:
        sys.exit(f"upstream production env has unmapped keys: {sorted(extra)}")
    up_kv = {k["binding"] for k in prod["kv_namespaces"]}
    if up_kv != set(n["kv"]):
        sys.exit(f"upstream KV bindings changed: {sorted(up_kv)}")
    return cfg


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    inst = load_env(sys.argv[1])
    for k in ("CUSTOMER_SLUG", "APP_HOST", "API_HOST", "COOKIE_DOMAIN"):
        if not inst.get(k):
            sys.exit(f"missing {k} in {sys.argv[1]}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", inst["CUSTOMER_SLUG"]):
        sys.exit("CUSTOMER_SLUG must be lowercase letters, digits, dashes (max 31)")
    st = pathlib.Path(sys.argv[2])
    state = json.loads(st.read_text()) if st.exists() else {}
    cfg = render(inst, state)
    pathlib.Path(sys.argv[3]).write_text(json.dumps(cfg, indent=2) + "\n")
    print(json.dumps({"names": names(inst["CUSTOMER_SLUG"])}, indent=2))


if __name__ == "__main__":
    main()
