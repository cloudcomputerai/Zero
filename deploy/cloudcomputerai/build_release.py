#!/usr/bin/env python3
"""Build a versioned EgorMail release bundle for the CloudComputerAI control plane.

Usage: build_release.py <version> <out_dir>

Produces <out_dir>/egormail-<version>.tar.gz (+ .sha256) containing:
  server/main.js         backend Worker bundle (code only; bindings are per instance)
  worker-template.json   everything the control plane needs to upload that bundle for a
                         tenant: compatibility settings, crons, Durable Object bindings and the
                         collapsed DO migration, base vars, binding names
  web/                   shared frontend (no instance URLs baked in; resolved at runtime)
  migrations/            Drizzle SQL migrations + journal
  migrate.mjs            self-contained migration runner (node migrate.mjs, needs DATABASE_URL)
  release.json           version + git commit
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile
import hashlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
from render_wrangler import names, render  # noqa: E402

# Base vars that are always set per instance by the control plane, so they are not part of
# the template (a stale value here would leak another host into a tenant).
PER_INSTANCE_VARS = {"COOKIE_DOMAIN", "VITE_PUBLIC_BACKEND_URL", "VITE_PUBLIC_APP_URL", "BETTER_AUTH_URL"}


def run(cmd, cwd, env=None):
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True, env={**os.environ, **(env or {})})


def collapsed_migration(cfg):
    """Fresh accounts cannot create KV-backed DO namespaces, so collapse upstream's history
    into one SQLite step holding the classes that survive it (same as cf/gen_server_js.py)."""
    live = []
    for m in cfg["migrations"]:
        for k in ("new_classes", "new_sqlite_classes"):
            live += m.get(k, [])
        for c in m.get("deleted_classes", []):
            live.remove(c)
    bound = sorted(d["class_name"] for d in cfg["durable_objects"]["bindings"])
    assert sorted(live) == bound, (live, bound)
    return {"new_tag": cfg["migrations"][-1]["tag"], "steps": [{"new_sqlite_classes": live}]}


def worker_template(cfg):
    n = names("release")
    return {
        "compatibility_date": cfg["compatibility_date"],
        "compatibility_flags": cfg.get("compatibility_flags", []),
        "crons": cfg["triggers"]["crons"],
        "durable_objects": [
            {"name": d["name"], "class_name": d["class_name"]} for d in cfg["durable_objects"]["bindings"]
        ],
        "migration": collapsed_migration(cfg),
        "ai_binding": cfg["ai"]["binding"],
        "kv_bindings": sorted(n["kv"]),
        "queue_bindings": {"thread": "thread_queue", "subscribe": "subscribe_queue"},
        "vectorize_bindings": {"threads": "VECTORIZE", "messages": "VECTORIZE_MESSAGE"},
        "r2_binding": "THREADS_BUCKET",
        "hyperdrive_binding": "HYPERDRIVE",
        "vars": {k: v for k, v in cfg["vars"].items() if k not in PER_INSTANCE_VARS},
    }


MIGRATE_SRC = """
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is required'); process.exit(2); }
const sql = postgres(url, { max: 1, ssl: process.env.PGSSLMODE === 'disable' ? false : 'prefer' });
const here = path.dirname(fileURLToPath(import.meta.url));
try {
  await migrate(drizzle(sql), { migrationsFolder: path.join(here, 'migrations') });
  console.log('migrations applied');
} finally {
  await sql.end();
}
"""


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    version, out_dir = sys.argv[1], pathlib.Path(sys.argv[2]).resolve()
    stage = out_dir / f"egormail-{version}"
    if stage.exists():
        shutil.rmtree(stage)
    (stage / "server").mkdir(parents=True)

    # Backend: render a throwaway config only to bundle; bindings are filled per tenant.
    inst = {"CUSTOMER_SLUG": "release", "APP_HOST": "release.invalid", "API_HOST": "api.release.invalid",
            "COOKIE_DOMAIN": "release.invalid"}
    cfg = render(inst, {})
    cfg_path = ROOT / "apps/server/wrangler.release.json"
    cfg_path.write_text(json.dumps(cfg, indent=2))
    try:
        bundle = stage / "server-build"
        run(["npx", "wrangler", "deploy", "-c", cfg_path.name, "--dry-run", "--minify", "--outdir", str(bundle)],
            cwd=ROOT / "apps/server")
        shutil.copy(bundle / "main.js", stage / "server/main.js")
        shutil.rmtree(bundle)
    finally:
        cfg_path.unlink(missing_ok=True)
    (stage / "worker-template.json").write_text(json.dumps(worker_template(cfg), indent=2) + "\n")

    # Frontend: no VITE_PUBLIC_*_URL, so every host resolves its own api.<host> at runtime.
    web_env = {k: "" for k in ("VITE_PUBLIC_BACKEND_URL", "VITE_PUBLIC_APP_URL")}
    web_env.update(NODE_ENV="production", NODE_OPTIONS="--max-old-space-size=8192")
    run(["pnpm", "run", "build"], cwd=ROOT / "apps/mail", env=web_env)
    shutil.copytree(ROOT / "apps/mail/build/client", stage / "web")

    # Migrations + a dependency-free runner.
    shutil.copytree(ROOT / "apps/server/src/db/migrations", stage / "migrations")
    src = ROOT / "apps/server/.migrate-entry.mjs"
    src.write_text(MIGRATE_SRC)
    try:
        # Native binary of the esbuild version wrangler uses (the .bin shim can resolve to an old JS entry).
        found = sorted(ROOT.glob("node_modules/.pnpm/@esbuild+linux-x64@0.2*/node_modules/@esbuild/linux-x64/bin/esbuild"))
        if not found:
            sys.exit("esbuild linux-x64 binary not found; run pnpm install")
        esbuild = found[-1]
        run([str(esbuild), src.name, "--bundle", "--platform=node", "--format=esm", "--target=node20",
             "--banner:js=import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
             f"--outfile={stage / 'migrate.mjs'}"], cwd=ROOT / "apps/server")
    finally:
        src.unlink(missing_ok=True)

    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    (stage / "release.json").write_text(json.dumps({"version": version, "commit": commit}, indent=2) + "\n")

    archive = out_dir / f"egormail-{version}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(stage, arcname=f"egormail-{version}")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (out_dir / f"egormail-{version}.tar.gz.sha256").write_text(f"{digest}  {archive.name}\n")
    print(json.dumps({"archive": str(archive), "sha256": digest}))


if __name__ == "__main__":
    main()
