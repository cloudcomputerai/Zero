#!/usr/bin/env python3
"""Workers static-assets deploy helper.
  assets.py manifest <dir> <manifest.json>       -> writes {"/path": {"hash","size"}} (+ hash->path map)
  assets.py upload <dir> <manifest.json> <session.json> -> uploads requested buckets, prints completion JWT to file
"""
import base64, hashlib, json, mimetypes, os, pathlib, sys, urllib.request, uuid

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("application/wasm", ".wasm")


def mime(p):
    # Cloudflare serves each asset with the Content-Type it was uploaded with.
    return mimetypes.guess_type(p.name)[0] or "application/octet-stream"

ACCOUNT = "bc8e15f958dc350e00c0e39d80ca6941"


def build_manifest(root):
    root = pathlib.Path(root)
    man, paths = {}, {}
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        data = p.read_bytes()
        if len(data) > 25 * 1024 * 1024:
            sys.exit(f"asset too large for Workers: {p}")
        # Content type is part of the hash so re-uploads replace assets stored with a wrong type.
        h = hashlib.sha256(base64.b64encode(data) + p.suffix.lstrip(".").encode() + mime(p).encode()).hexdigest()[:32]
        rel = "/" + p.relative_to(root).as_posix()
        man[rel] = {"hash": h, "size": len(data)}
        paths[h] = str(p)
    return man, paths


def upload(root, man_path, session_path, out_path):
    man = json.load(open(man_path))
    _, paths = build_manifest(root)
    sess = json.load(open(session_path))
    jwt, buckets = sess["jwt"], sess.get("buckets") or []
    completion = jwt if not buckets else None
    for i, bucket in enumerate(buckets):
        bd = uuid.uuid4().hex
        parts = []
        for h in bucket:
            p = pathlib.Path(paths[h])
            parts.append(
                f'--{bd}\r\nContent-Disposition: form-data; name="{h}"; filename="{h}"\r\n'
                f"Content-Type: {mime(p)}\r\n\r\n".encode()
                + base64.b64encode(p.read_bytes())
                + b"\r\n"
            )
        body = b"".join(parts) + f"--{bd}--\r\n".encode()
        req = urllib.request.Request(
            f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/assets/upload?base64=true",
            data=body, method="POST",
            headers={"Authorization": f"Bearer {jwt}", "Content-Type": f"multipart/form-data; boundary={bd}"})
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.load(r)
        if not res.get("success"):
            sys.exit(f"bucket {i} failed: {res.get('errors')}")
        if res.get("result", {}).get("jwt"):
            completion = res["result"]["jwt"]
        print(f"bucket {i + 1}/{len(buckets)}: {len(bucket)} files ok", flush=True)
    if not completion:
        sys.exit("no completion token returned")
    fd = os.open(out_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.write(fd, completion.encode())
    os.close(fd)
    print("completion token saved")


if __name__ == "__main__":
    if sys.argv[1] == "manifest":
        m, _ = build_manifest(sys.argv[2])
        json.dump(m, open(sys.argv[3], "w"))
        print(len(m), "files")
    elif sys.argv[1] == "upload":
        upload(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
