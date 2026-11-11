"""
Cliente TCP hacia el "Bridge" que corre DENTRO de Civil 3D (C#).
El bridge escucha en 127.0.0.1:8765 y ejecuta comandos JSON en la API
de Civil 3D usando el hilo de UI (Document.LockDocument()).
"""
from __future__ import annotations

import json
import socket
import threading

HOST = "127.0.0.1"
PORT = 8765
_lock = threading.Lock()


class BridgeError(RuntimeError):
    pass


def _send(command: str, params: dict | None = None, timeout: float = 30.0) -> dict:
    payload = json.dumps({"cmd": command, "params": params or {}})
    with _lock:
        try:
            with socket.create_connection((HOST, PORT), timeout=timeout) as s:
                s.sendall(payload.encode("utf-8") + b"\n")
                buf = b""
                while not buf.endswith(b"\n"):
                    chunk = s.recv(65536)
                    if not chunk:
                        break
                    buf += chunk
        except (ConnectionRefusedError, socket.timeout, OSError) as e:
            raise BridgeError(
                "No hay conexión con Civil 3D. ¿Está AutoCAD/Civil 3D abierto "
                "y ejecutaste el comando NETLOAD + CIVILMCPLISTEN?"
            ) from e
    resp = json.loads(buf.decode("utf-8"))
    if not resp.get("ok", False):
        raise BridgeError(resp.get("error", "Error desconocido en el bridge"))
    return resp.get("data", {})


def is_bridge_alive(timeout: float = 2.0) -> bool:
    try:
        _send("ping", timeout=timeout)
        return True
    except Exception:
        return False


# ---------- Operaciones de alto nivel ----------

def get_drawing_info() -> dict:
    return _send("get_drawing_info")


def create_point(x: float, y: float, z: float = 0.0,
                 descr: str = "", pf: str = "") -> dict:
    return _send("create_point", {"x": x, "y": y, "z": z,
                                  "descr": descr, "pf": pf})


def create_points_batch(points: list[dict], pf: str = "") -> dict:
    """points: [{"number":1,"x":..,"y":..,"z":..,"descr":".."}, ...]"""
    return _send("create_points_batch", {"points": points, "pf": pf})


def list_points(max_count: int = 200) -> dict:
    return _send("list_points", {"max": max_count})


def create_alignment(name: str, stations: list[float],
                     elevations: list[float]) -> dict:
    """Alineación por puntos de diseño (estacion, elevación X,Y).
    Genera una polylinea 2D y la convierte en Alignment."""
    return _send("create_alignment", {"name": name,
                                       "stations": stations,
                                       "elevations": elevations})


def create_surface_from_points(name: str, point_numbers: list[int] | None = None,
                               tin_slope: float = -0.5) -> dict:
    return _send("create_surface", {"name": name,
                                    "points": point_numbers,
                                    "tinslope": tin_slope})


def add_surface_boundaries_breaklines(name: str, entities: list[str]) -> dict:
    return _send("add_breaklines", {"surface": name, "entities": entities})


def create_profile(name: str, alignment: str, style: str,
                   pvis: list[dict]) -> dict:
    """pvis: [{"sta":0,"elev":100,"k":0,...}, ...] (PVI's del perfil)"""
    return _send("create_profile", {"name": name, "alignment": alignment,
                                    "style": style, "pvis": pvis})


def create_corridor(name: str, assembly: str, baseline: str,
                    profile: str, targets: list[str] | None = None) -> dict:
    return _send("create_corridor", {"name": name, "assembly": assembly,
                                     "baseline": baseline, "profile": profile,
                                     "targets": targets or []})


def create_pipe_network(name: str, pipes: list[dict],
                        structures: list[dict] | None = None) -> dict:
    return _send("create_pipe_network", {"name": name, "pipes": pipes,
                                         "structures": structures or []})


def run_command(command: str, args: list[str] | None = None) -> dict:
    """Ejecuta un comando nativo de la línea de comandos de Civil 3D."""
    return _send("run_command", {"command": command, "args": args or []})


def evaluate_lisp(expr: str) -> dict:
    """Evalúa una expresión AutoLISP/Script como escape hatch."""
    return _send("eval", {"expr": expr})
