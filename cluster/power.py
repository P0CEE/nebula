#!/usr/bin/env python3
"""Arret propre puis rallumage des 3 noeuds Swarm (le registry reste allume).

    export PVE_TOKEN='PVEAPIToken=...'      # jamais commite
    ./cluster/power.py stop    # workers puis manager, un par un (poweroff)
    ./cluster/power.py start   # les 3 en meme temps, le cluster se reforme seul
"""
import json, os, ssl, subprocess, sys, time, urllib.parse, urllib.request

API = os.environ.get("PVE_API", "https://10.255.0.224:8006/api2/json")
TOKEN = os.environ.get("PVE_TOKEN") or sys.exit("PVE_TOKEN manquant")
CTX = ssl._create_unverified_context()  # certificat auto-signe du lab
STOP_ORDER = ["swarm-3", "swarm-2", "swarm-1"]   # workers d'abord, manager en dernier


def call(method, path):
    req = urllib.request.Request(f"{API}/{path}", method=method, headers={"Authorization": TOKEN})
    for _ in range(5):
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
                return json.load(r)["data"]
        except OSError:
            time.sleep(3)
    sys.exit(f"{method} {path} -> reseau injoignable")


def vms():
    return {v["name"]: v for v in call("GET", "cluster/resources?type=vm") if v.get("name") in STOP_ORDER}


def wait_status(name, wanted):
    while (v := vms()[name])["status"] != wanted:
        time.sleep(3)


t0 = time.time()
if sys.argv[1:] == ["stop"]:
    for name in STOP_ORDER:
        print(f"[{time.time() - t0:5.0f}s] arret de {name}", flush=True)
        subprocess.run(["ssh", "-o", "ConnectTimeout=40", name, "sudo systemctl poweroff"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wait_status(name, "stopped")
        print(f"[{time.time() - t0:5.0f}s] {name} arretee", flush=True)
elif sys.argv[1:] == ["start"]:
    for name, v in vms().items():
        call("POST", f"nodes/{v['node']}/qemu/{v['vmid']}/status/start")
        print(f"[{time.time() - t0:5.0f}s] demarrage de {name}", flush=True)
    for name in STOP_ORDER:
        wait_status(name, "running")
    print(f"[{time.time() - t0:5.0f}s] les 3 VM tournent ; le cluster se reforme", flush=True)
else:
    sys.exit(__doc__)
