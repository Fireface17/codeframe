import json, sys, urllib.request
CID = "kimne78kx3ncx6brgo4mv6wki5h1ko"
def gql(payload):
    req = urllib.request.Request("https://gql.twitch.tv/gql", data=json.dumps(payload).encode(),
        headers={"Client-ID": CID, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)
def clip_offset(slug):
    q = 'query($s:ID!){clip(slug:$s){title viewCount durationSeconds videoOffsetSeconds video{id}}}'
    return gql({"query": q, "variables": {"s": slug}})["data"]["clip"]
def comments(video_id, offset):
    p = {"operationName": "VideoCommentsByOffsetOrCursor",
         "variables": {"videoID": str(video_id), "contentOffsetSeconds": int(offset)},
         "extensions": {"persistedQuery": {"version": 1, "sha256Hash": "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"}}}
    d = gql(p)
    edges = (((d.get("data") or {}).get("video") or {}).get("comments") or {}).get("edges") or []
    out = []
    for e in edges:
        n = e["node"]
        txt = "".join(f.get("text", "") for f in (n.get("message") or {}).get("fragments") or [])
        out.append((n["contentOffsetSeconds"], txt))
    return out
if __name__ == "__main__":
    if sys.argv[1] == "clips":
        for slug in sys.stdin.read().split():
            try:
                c = clip_offset(slug)
                print(json.dumps({"slug": slug, "title": c["title"], "views": c["viewCount"], "dur": c["durationSeconds"],
                                  "vod": (c.get("video") or {}).get("id"), "off": c.get("videoOffsetSeconds")}, ensure_ascii=False))
            except Exception as e:
                print(json.dumps({"slug": slug, "err": str(e)[:100]}))
    elif sys.argv[1] == "chat":
        c = comments(sys.argv[2], sys.argv[3]); print(len(c), c[:5], c[-1:] )
