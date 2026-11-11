# MCP para Civil 3D — controla tu diseño con IA

¿Es posible? **Sí.** La única limitación es que Civil 3D solo corre en Windows y su
API (.NET) exige ejecutar dentro del proceso de la aplicación. Por eso la solución
tiene 3 capas:

```
Claude Desktop / cualquier LLM
        │  MCP (stdio, JSON-RPC)
        ▼
server/server.py  (Python, FastMCP)      ← este repo
        │  TCP JSON localhost:8765
        ▼
bridge_csharp/Civil3dBridge.dll          ← NETLOAD dentro de Civil 3D
        │  API .NET (Autodesk.Civil.DatabaseServices)
        ▼
Dibujo de Civil 3D (puntos, superficies, alineaciones, perfiles, corredores, redes)
```

## 1. Compilar el bridge (en Windows, una sola vez)

```powershell
cd bridge_csharp
dotnet build -c Release        # requiere el SDK .NET 8 y las DLLs de AutoCAD/Civil 3D
```

Ajusta las rutas de `<HintPath>` del `.csproj` a tu versión instalada
(Civil 3D 2021–2024 → usa `net48`; 2025+ → `net8.0-windows`).

## 2. Cargarlo en Civil 3D

1. Abre Civil 3D.
2. Comando `NETLOAD` → selecciona `Civil3dBridge.dll`.
3. Comando `CIVILMCPLISTEN` → verás *"Bridge MCP escuchando en 127.0.0.1:8765"*.

## 3. Instalar y registrar el servidor MCP

```bash
pip install -r server/requirements.txt
```

En `claude_desktop_config.json` (Claude Desktop) o el config de tu cliente MCP:

```json
{
  "mcpServers": {
    "civil3d": {
      "command": "python",
      "args": ["C:/ruta/al/repo/civil3d-mcp/server/server.py"]
    }
  }
}
```

Reinicia el cliente. Herramientas disponibles:

| Herramienta | Qué hace |
|---|---|
| `civil3d_status` | Verifica conexión e info del dibujo |
| `create_civil_point(s)` / `list_civil_points` | Puntos AECC |
| `create_tin_surface` / `add_breaklines_to_surface` | Superficies TIN |
| `create_alignment` | Alineaciones horizontales |
| `create_profile` | Perfiles de diseño por PVI's |
| `create_corridor` | Corredores (ensamble + baseline + perfil + targets) |
| `create_pipe_network` | Redes de tuberías/estructuras |
| `run_autocad_command` / `eval_autolisp` | Escape hatches para lo no cubierto |

## 4. Ejemplo de uso con IA

> "Lee los puntos topográficos del dibujo, crea una superficie TIN llamada
> 'Terreno', luego traza una alineación de 800 m con dos curvas circulares
> y genera un perfil tipo rasante con pendiente máxima 8%."

El modelo encadena `list_civil_points → create_tin_surface → create_alignment →
create_profile` automáticamente.

## Notas y limitaciones

- **Hilo de UI:** toda la API de Civil 3D debe ejecutarse en el hilo principal;
  el bridge lo garantiza con `ExecuteInApplicationContext`. Evita comandos
  modalmente interactivos desde la IA.
- **Estilos/nombres:** las herramientas aceptan nombres de estilos del drawing
  template; si no existen, Civil 3D usará los predeterminados o devolverá error.
- **Seguridad:** el listener solo acepta conexiones de loopback (127.0.0.1).
- **Alternativas sin C#:** puede sustituirse el bridge por AutoLISP+`sendstring`,
  o por la API COM (`IApplication`) desde Python (`pywin32`) — más simple pero
  la COM no expone objetos Civil (alineaciones, corredores), por eso el puente .NET
  es la vía recomendada.
- **Roadmap:** añadir `get_volume_cut_fill`, `create_sections`, exportar a LandXML,
  y recursos MCP (surface report, point list) para dar contexto al modelo.
