#!/usr/bin/env bash
# Run a JS file through Composio's Cloudflare MCP execute tool. Usage: cfx.sh <file.js> [out.json]
set -euo pipefail
S=${TMPDIR:-/tmp}
js=$1; out=${2:-$S/last.out}
python3 -c "import json,sys;print(json.dumps({'account_id':'bc8e15f958dc350e00c0e39d80ca6941','code':open(sys.argv[1]).read()}))" "$js" > "$S/.req.json"
(cd ~ && composio execute CLOUDFLARE_MCP_EXECUTE -d @"$S/.req.json") > "$out" 2>&1
rm -f "$S/.req.json"
