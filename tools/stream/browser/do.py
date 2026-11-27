"""Отправить шаги в постоянный сеанс браузера. python3 do.py '<часть адреса вкладки>' '<json шагов>'"""
import json, sys, urllib.request
body = json.dumps({"tab": sys.argv[1], "steps": json.loads(sys.argv[2])}).encode()
req = urllib.request.Request("http://127.0.0.1:9333/do", data=body, headers={"Content-Type": "application/json"})
print(urllib.request.urlopen(req, timeout=600).read().decode())
