import sys, datetime
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
from gql import gql
q = 'query($l:String!){user(login:$l){stream{id createdAt viewersCount game{name}} videos(first:1,type:ARCHIVE){edges{node{id lengthSeconds createdAt status}}}}}'
now = datetime.datetime.now(datetime.timezone.utc)
for login in sys.argv[1:]:
    u = gql({"query": q, "variables": {"l": login}})["data"]["user"]
    if not u or not u.get("stream"): print(login, "— не в эфире"); continue
    st = u["stream"]; up = (now - datetime.datetime.fromisoformat(st["createdAt"].replace("Z", "+00:00"))).total_seconds()
    v = u["videos"]["edges"][0]["node"] if u["videos"]["edges"] else None
    print(f'{login}: в эфире {up/60:.0f} мин, зрителей {st["viewersCount"]}, игра {(st.get("game") or {}).get("name")} | запись {v and v["id"]} длиной {v and v["lengthSeconds"]/60:.0f} мин, статус {v and v["status"]}')
