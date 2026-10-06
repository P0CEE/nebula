#!/usr/bin/env python3
"""Cree les 4 VM du lab sur Proxmox (3 noeuds Swarm + registry), idempotent.

    # token : .secrets/pve-token (ignore par git) ou variable PVE_TOKEN
    ./cluster/create-vms.py

Clone du template Debian cloud-init, reseau du LAN du routeur, IP fixe,
cle SSH, demarrage automatique avec l'hyperviseur.
"""
import json, os, ssl, sys, time, urllib.parse, urllib.request
from pathlib import Path

API = os.environ.get("PVE_API", "https://10.255.0.224:8006/api2/json")
_TOKEN_FILE = Path(__file__).resolve().parent.parent / ".secrets" / "pve-token"
TOKEN = os.environ.get("PVE_TOKEN") or (_TOKEN_FILE.read_text().strip() if _TOKEN_FILE.exists() else None) \
    or sys.exit("PVE_TOKEN manquant (variable ou .secrets/pve-token)")
SSHKEY = Path(os.environ.get("SSH_PUBKEY", Path.home() / ".ssh/id_ed25519.pub")).read_text().strip()
CTX = ssl._create_unverified_context()  # certificat auto-signe du lab

SRC_NODE, TEMPLATE = "airbus4", 90500   # debian-trixie
POOL, STORAGE, BRIDGE = "antoine.fromentin", "airbus-san", "vn1020"
GW = "10.96.252.254"
# nom, hyperviseur, IP, memoire (Mo) : un noeud Swarm par hyperviseur.
VMS = [("swarm-1", "airbus2", "10.96.252.11", 2048),
       ("swarm-2", "airbus3", "10.96.252.12", 2048),
       ("swarm-3", "airbus4", "10.96.252.13", 2048),
       ("registry", "airbus3", "10.96.252.20", 1024)]


def call(method, path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(f"{API}/{path}", data=body, method=method,
                                 headers={"Authorization": TOKEN})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
                return json.load(r)["data"]
        except urllib.error.HTTPError as e:
            sys.exit(f"{method} {path} -> {e.code} {e.read().decode()[:300]}")
        except OSError as e:
            print(f"  [nouvel essai {attempt + 1}] {e}", flush=True)
            time.sleep(3)
    sys.exit(f"{method} {path} -> reseau injoignable")


def wait(node, upid):
    while True:
        st = call("GET", f"nodes/{node}/tasks/{urllib.parse.quote(upid)}/status")
        if st["status"] == "stopped":
            if st.get("exitstatus") != "OK":
                sys.exit(f"tache en echec : {st.get('exitstatus')}")
            return
        time.sleep(3)


existing = {v.get("name") for v in call("GET", "cluster/resources?type=vm")}
for name, node, ip, mem in VMS:
    if name in existing:
        print(f"{name}: existe deja")
        continue
    vmid = int(call("GET", "cluster/nextid"))
    print(f"{name}: clone -> vmid {vmid} sur {node}", flush=True)
    wait(SRC_NODE, call("POST", f"nodes/{SRC_NODE}/qemu/{TEMPLATE}/clone", {
        "newid": vmid, "name": name, "full": 1, "pool": POOL,
        "storage": STORAGE, "target": node}))
    call("POST", f"nodes/{node}/qemu/{vmid}/config", {
        "net0": f"virtio,bridge={BRIDGE}",
        "ipconfig0": f"ip={ip}/24,gw={GW}",
        "nameserver": GW,
        "sshkeys": urllib.parse.quote(SSHKEY, safe=""),
        "memory": mem,
        "onboot": 1})
    wait(node, call("POST", f"nodes/{node}/qemu/{vmid}/status/start"))
    print(f"{name}: demarree ({ip})", flush=True)
