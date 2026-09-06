#!/usr/bin/env bash
# Publish this site to Google Cloud object storage and refresh the CDN.
# The site serves from gs://agentmesh-ai-site behind the agentcatalog-lb
# load balancer; GitHub is source only and does not serve the site.
set -euo pipefail
BUCKET=gs://agentmesh-ai-site
HOSTS=(agentmesh.ai www.agentmesh.ai)
PROJECT=langbench-1528148150979
GCLOUD="${GCLOUD:-/c/Users/jeffr/google-cloud-sdk-extract/google-cloud-sdk/bin/gcloud.cmd}"

cd "$(dirname "$0")"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
git ls-files | grep -v -e '^CNAME$' -e '^deploy\.sh$' | while read -r f; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done
"$GCLOUD" storage cp -r "$STAGE"/* "$BUCKET/" --project "$PROJECT"
# The EXT-11 site agent file: dot-directories miss the glob above, and the
# extensionless name needs its content type pinned to JSON by hand.
if [ -f "$STAGE/.well-known/agentmesh" ]; then
  "$GCLOUD" storage cp "$STAGE/.well-known/agentmesh" "$BUCKET/.well-known/agentmesh"     --content-type=application/json --project "$PROJECT"
fi
# The MCP registry publisher proof and our own ARD manifest live in the same
# dot-directory, so they need the same hand-carry. The proof file must stay
# byte-identical to what mcp-publisher signed against.
if [ -f "$STAGE/.well-known/mcp-registry-auth" ]; then
  "$GCLOUD" storage cp "$STAGE/.well-known/mcp-registry-auth" "$BUCKET/.well-known/mcp-registry-auth"     --content-type=text/plain --project "$PROJECT"
fi
if [ -f "$STAGE/.well-known/ai-catalog.json" ]; then
  "$GCLOUD" storage cp "$STAGE/.well-known/ai-catalog.json" "$BUCKET/.well-known/ai-catalog.json"     --content-type=application/json --project "$PROJECT"
fi
# The domain proof for this organisation's charter: the app generates the value,
# this file publishes it, and the verifier reads it over https.
if [ -f "$STAGE/.well-known/agentmesh-domain.json" ]; then
  "$GCLOUD" storage cp "$STAGE/.well-known/agentmesh-domain.json" "$BUCKET/.well-known/agentmesh-domain.json"     --content-type=application/json --project "$PROJECT"
fi
# The charter's own proof, which is a different claim from the one above: that
# whoever controls this domain published THIS charter, named by its id. The
# mandate registry checks it itself and does not take the platform's word for
# it. Extensionless, so the content type needs pinning by hand.
if [ -f "$STAGE/.well-known/agent-charter" ]; then
  "$GCLOUD" storage cp "$STAGE/.well-known/agent-charter" "$BUCKET/.well-known/agent-charter"     --content-type=application/json --project "$PROJECT"
fi
for h in "${HOSTS[@]}"; do
  "$GCLOUD" compute url-maps invalidate-cdn-cache agentcatalog-lb --path "/*" --host "$h" --project "$PROJECT"
done
echo "deployed: https://${HOSTS[0]}"
