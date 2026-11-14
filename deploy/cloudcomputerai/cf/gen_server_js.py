#!/usr/bin/env python3
"""Generate a Cloudflare MCP execute script that uploads the Zero backend Worker.
Usage: gen_server_js.py <wrangler.owner.json> <bundle main.js> <secrets.env> <state.json> > out.js"""
import json, sys

cfg = json.load(open(sys.argv[1]))
import base64, gzip
script_b64 = base64.b64encode(gzip.compress(open(sys.argv[2], "rb").read(), 9)).decode()  # Composio caps request size; gunzip in sandbox
secrets = {}
for line in open(sys.argv[3]):
    if "=" in line:
        k, v = line.rstrip("\n").split("=", 1)
        secrets[k] = v
state = json.load(open(sys.argv[4]))

b = []
for d in cfg["durable_objects"]["bindings"]:
    b.append({"type": "durable_object_namespace", "name": d["name"], "class_name": d["class_name"]})
for k in cfg["kv_namespaces"]:
    b.append({"type": "kv_namespace", "name": k["binding"], "namespace_id": k["id"]})
for q in cfg["queues"]["producers"]:
    b.append({"type": "queue", "name": q["binding"], "queue_name": q["queue"]})
for v in cfg["vectorize"]:
    b.append({"type": "vectorize", "name": v["binding"], "index_name": v["index_name"]})
for h in cfg["hyperdrive"]:
    b.append({"type": "hyperdrive", "name": h["binding"], "id": h["id"]})
for r in cfg["r2_buckets"]:
    b.append({"type": "r2_bucket", "name": r["binding"], "bucket_name": r["bucket_name"]})
b.append({"type": "ai", "name": cfg["ai"]["binding"]})
for k, v in cfg["vars"].items():
    b.append({"type": "plain_text", "name": k, "text": v})
b.append({"type": "plain_text", "name": "REDIS_URL", "text": f"https://{state['redis_host']}"})
for k in ("REDIS_TOKEN", "BETTER_AUTH_SECRET", "JWT_SECRET", "CREDENTIALS_ENCRYPTION_KEYS",
          "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "OPENROUTER_API_KEY", "RESEND_API_KEY",
          "AUTUMN_SECRET_KEY"):
    if secrets.get(k):
        b.append({"type": "secret_text", "name": k, "text": secrets[k]})

migs = cfg["migrations"]
meta = {
    "main_module": "main.js",
    "compatibility_date": cfg["compatibility_date"],
    "compatibility_flags": cfg.get("compatibility_flags", []),
    "bindings": b,
    "observability": {"enabled": True},
}
# Fresh instance: KV-backed DO namespaces can no longer be created, so collapse upstream's
# history into one SQLite step holding the classes that survive it (DurableMailbox was deleted).
live = []
for m in migs:
    for k in ("new_classes", "new_sqlite_classes"):
        live += m.get(k, [])
    for c in m.get("deleted_classes", []):
        live.remove(c)
meta["migrations"] = {"new_tag": migs[-1]["tag"], "steps": [{"new_sqlite_classes": live}]}
assert sorted(live) == sorted(d["class_name"] for d in cfg["durable_objects"]["bindings"]), live
name = cfg["name"]
host = cfg["routes"][0]["pattern"]
crons = cfg["triggers"]["crons"]
queues = state["queues"]

print(f"""async () => {{
  const A = accountId, N = {json.dumps(name)}, out = {{}};
  const req = async (o) => {{ try {{ const r = await cloudflare.request(o); return {{ ok: true, r: r.result }}; }} catch (e) {{ return {{ ok: false, err: String(e.message).slice(0, 1500) }}; }} }};
  const meta = {json.dumps(meta)};
  // Keep existing DO migration state on redeploys: send only migrations not applied yet.
  const cur = await req({{ method: 'GET', path: `/accounts/${{A}}/workers/scripts/${{N}}/settings` }});
  const applied = cur.ok && cur.r && cur.r.migration_tag;
  if (cur.ok && !applied) delete meta.migrations; // exists; settings omit the tag (deployed at collapsed tag)
  else if (applied) {{
    // Already deployed: only proceed when it is at the collapsed tag; new upstream migrations need review.
    if (applied !== meta.migrations.new_tag) return {{ stop: 'deployed migration tag ' + applied + ' differs; add explicit steps' }};
    delete meta.migrations;
  }}
  const gz = Uint8Array.from(atob({json.dumps(script_b64)}), c => c.charCodeAt(0)); const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); out.bytes = code.length;
  const bd = 'F' + Date.now();
  const body = ['--' + bd, 'Content-Disposition: form-data; name="metadata"', 'Content-Type: application/json', '', JSON.stringify(meta),
    '--' + bd, 'Content-Disposition: form-data; name="main.js"; filename="main.js"', 'Content-Type: application/javascript+module', '', code, '--' + bd + '--'].join('\\r\\n');
  const up = await req({{ method: 'PUT', path: `/accounts/${{A}}/workers/scripts/${{N}}`, body, contentType: 'multipart/form-data; boundary=' + bd, rawBody: true }});
  out.upload = up.ok ? {{ id: up.r && up.r.id, etag: up.r && up.r.etag }} : up.err;
  if (!up.ok) return out;
  out.schedules = (await req({{ method: 'PUT', path: `/accounts/${{A}}/workers/scripts/${{N}}/schedules`, body: {json.dumps([{"cron": c} for c in crons])} }})).ok;
  out.consumers = {{}};
  for (const qid of {json.dumps(list(queues.values()))}) {{
    const ex = await req({{ method: 'GET', path: `/accounts/${{A}}/queues/${{qid}}/consumers` }});
    if (ex.ok && (ex.r || []).some(c => c.script === N || c.service === N)) {{ out.consumers[qid] = 'exists'; continue; }}
    const c = await req({{ method: 'POST', path: `/accounts/${{A}}/queues/${{qid}}/consumers`, body: {{ type: 'worker', script_name: N }} }});
    out.consumers[qid] = c.ok ? 'ok' : c.err;
  }}
  const dm = await req({{ method: 'PUT', path: `/accounts/${{A}}/workers/domains`, body: {{ environment: 'production', hostname: {json.dumps(host)}, service: N, zone_id: {json.dumps(state.get('app_zone_id', state['zone_id']))} }} }});
  out.domain = dm.ok ? 'ok' : dm.err;
  return out;
}}""")
