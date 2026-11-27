"""Кто сейчас стримит игру на Twitch: топ по зрителям. python3 top.py "<название игры>" [RU|EN|ALL] [сколько]"""
import sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from gql import gql


def top(name, lang="ALL", n=15):
    opt = "" if lang == "ALL" else f",options:{{broadcasterLanguages:[{lang}]}}"
    q = 'query($n:String!){game(name:$n){id name viewersCount streams(first:%d%s){edges{node{viewersCount title broadcaster{login}}}}}}' % (n, opt)
    g = (gql({"query": q, "variables": {"n": name}}).get("data") or {}).get("game")
    if not g:
        return None, []
    return g, [(e["node"]["viewersCount"], e["node"]["broadcaster"]["login"], e["node"]["title"]) for e in g["streams"]["edges"] if e["node"]["broadcaster"]]


if __name__ == "__main__":
    name = sys.argv[1]; lang = (sys.argv[2] if len(sys.argv) > 2 else "ALL").upper(); n = int(sys.argv[3]) if len(sys.argv) > 3 else 15
    g, rows = top(name, lang, n)
    if not g:
        print("категория не найдена:", name); sys.exit()
    print(f'{g["name"]} [{lang}]: зрителей в категории {g["viewersCount"]}')
    for v, login, title in rows:
        print(f'{v:>7}  {login:22s} {title[:60]}')
