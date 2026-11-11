#!/usr/bin/env python3
"""
Civil 3D MCP Server
===================
Servidor Model Context Protocol (transporte stdio) que expone herramientas
para operar Autodesk Civil 3D mediante IA.

Arquitectura:
    Claude / cualquier LLM  <--MCP/stdio-->  este servidor  <--TCP JSON-->
        Bridge C# (NETLOAD dentro de Civil 3D)  -->  API de Civil 3D

Requisitos: pip install "mcp[cli]"  +  el bridge cargado en Civil 3D.
"""
from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

import civil3d_bridge as b

mcp = FastMCP(
    "civil3d",
    instructions=(
        "Herramientas para diseñar infraestructura civil en Autodesk Civil 3D: "
        "puntos, superficies TIN, alineaciones, perfiles, corredores y redes "
        "de tuberías. Requiere que Civil 3D esté abierto con el bridge cargado "
        "(comando CIVILMCPLISTEN). Usa civil3d_status primero."
    ),
)


def _guard(fn):
    """Convierte errores del bridge en texto legible para el modelo."""
    try:
        return json.dumps(fn(), ensure_ascii=False, indent=2)
    except b.BridgeError as e:
        return f"ERROR: {e}"
    except Exception as e:  # noqa: BLE001
        return f"ERROR inesperado: {type(e).__name__}: {e}"


# ---------------- Estado / diagnóstico ----------------

@mcp.tool()
def civil3d_status() -> str:
    """Verifica si el bridge dentro de Civil 3D está activo y devuelve
    información del dibujo abierto (nombre, unidades, versiones)."""
    return _guard(b.get_drawing_info)


# ---------------- Puntos ----------------

@mcp.tool()
def create_civil_point(x: float, y: float, z: float = 0.0,
                       description: str = "", point_group: str = "") -> str:
    """Crea un punto de Civil 3D (AECC_POINT) en las coordenadas dadas."""
    return _guard(lambda: b.create_point(x, y, z, description, point_group))


@mcp.tool()
def create_civil_points(points: list[dict], point_group: str = "") -> str:
    """Crea múltiples puntos. Cada elemento: {"x":..,"y":..,"z":..,
    "descr":".."}. 'number' es opcional (se autoincrementa)."""
    return _guard(lambda: b.create_points_batch(points, point_group))


@mcp.tool()
def list_civil_points(max_count: int = 200) -> str:
    """Lista los puntos existentes en el dibujo (número, X, Y, Z, descripción)."""
    return _guard(lambda: b.list_points(max_count))


# ---------------- Superficies ----------------

@mcp.tool()
def create_tin_surface(name: str, tin_slope: float = -0.5) -> str:
    """Crea una superficie TIN vacía (luego usa add_points_to_surface o
    data sources). tin_slope=-0.5 significa sin límite de pendiente."""
    return _guard(lambda: b.create_surface_from_points(name, None, tin_slope))


@mcp.tool()
def add_breaklines_to_surface(surface: str, entity_handles: list[str]) -> str:
    """Añade entidades (polilíneas/líneas por handle) como breaklines
    a la superficie indicada."""
    return _guard(lambda: b.add_surface_boundaries_breaklines(surface, entity_handles))


# ---------------- Alineaciones ----------------

@mcp.tool()
def create_alignment(name: str, points_xy: list[list[float]]) -> str:
    """Crea una alineación horizontal (Alignment) a partir de una lista de
    vértices [x, y]. Para trazados complejos la IA debe densificar curvas."""
    def run():
        xs = [p[0] for p in points_xy]
        ys = [p[1] for p in points_xy]
        return b.create_alignment(name, xs, ys)
    return _guard(run)


# ---------------- Perfiles ----------------

@mcp.tool()
def create_profile(name: str, alignment: str, pvis: list[dict],
                   style: str = "") -> str:
    """Crea un perfil de diseño sobre la alineación indicada.
    pvis: [{"sta": 0+00.00 en metros, "elev": 100.5}, ...]
    style: nombre del estilo de perfil; vacío = predeterminado."""
    return _guard(lambda: b.create_profile(name, alignment, style, pvis))


# ---------------- Corredores ----------------

@mcp.tool()
def create_corridor(name: str, assembly: str, alignment: str,
                    profile: str, targets: list[str] | None = None) -> str:
    """Crea un corredor asociando un ensamble (assembly) a un baseline
    (alineación) con un perfil, y opcionales targets por nombre."""
    return _guard(lambda: b.create_corridor(name, assembly, alignment,
                                            profile, targets))


# ---------------- Redes de tuberías ----------------

@mcp.tool()
def create_pipe_network(name: str, pipes: list[dict],
                        structures: list[dict] | None = None) -> str:
    """Crea una red de alcantarillado/conducción.
    pipes: [{"start":[x,y,z],"end":[x,y,z],"dia":300,"material":"PVC","slope":0.01}, ...]
    structures: [{"x":..,"y":..,"z":..,"type":"Manhole"}, ...]"""
    return _guard(lambda: b.create_pipe_network(name, pipes, structures))


# ---------------- Escape hatches ----------------

@mcp.tool()
def run_autocad_command(command: str, args: list[str] | None = None) -> str:
    """Envía un comando nativo a la línea de comandos de Civil 3D
    (ej. 'GCSCONVERT', '_ZOOM', 'E'). Útil para operaciones no cubiertas."""
    return _guard(lambda: b.run_command(command, args))


@mcp.tool()
def eval_autolisp(expr: str) -> str:
    """Evalúa una expresión AutoLISP en el contexto de Civil 3D, ej:
    (vla-getActiveDocument (vlax-get-acad-object)). Escape hatch avanzado."""
    return _guard(lambda: b.evaluate_lisp(expr))


if __name__ == "__main__":
    mcp.run(transport="stdio")
