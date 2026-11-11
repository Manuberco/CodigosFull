# 🐤 EXPLÍCAME TIPO COQUITO
## Cómo hacer correr el MCP de Civil 3D

---

## PRIMERO: La historia de los tres amiguitos 🎭

Imagina que en tu computador trabajan **tres amiguitos**:

| Amiguito | ¿Quién es? | ¿Qué hace? |
|---|---|---|
| 🤖 **El Robot** | Claude (la IA) | Piensa y da órdenes. Pero está "lejos", no toca tu AutoCAD. |
| 🧑‍💼 **El Traductor** | El servidor MCP (`server.py`) | Recibe las órdenes del Robot y las pasa al Obrero. Habla con papeles en español... digo, en JSON. |
| 👷 **El Obrero** | El puente C# (`Civil3dBridge.dll`) | Es el ÚNICO que puede tocar Civil 3D por dentro, porque vive ADENTRO de Civil 3D. |

```
🤖 Robot  ──nota──▶  🧑‍💼 Traductor  ──telefónema──▶  👷 Obrero  ──manos──▶  🏗️ CIVIL 3D
(Claude)             (python server.py)   (puerto 8765)   (dentro de Civil3D)
```

**¿Por qué son tres y no uno?** Porque el Obrero tiene que estar METIDO dentro de Civil 3D (así lo exige Autodesk: nadie toca su API desde afuera). Y el Robot no sabe entrar ahí. Entonces se pasan notas. 📝

---

## SEGUNDO: ¿Qué necesito? 🎒 (tu mochila escolar)

1. 💻 Una PC con **Windows** (Civil 3D NO existe en Mac 😢)
2. 🏗️ **Civil 3D 2021 o más nuevo** instalado
3. 🐍 **Python 3.10+** → descárgalo de python.org
   ⚠️ Cuando instales Python, marca la casillita **"Add Python to PATH"** ✅ (¡es la causa #1 de problemas!)
4. 🔨 **.NET SDK 8** → descárgalo de microsoft.com (sirve para "cocinar" la DLL del Obrero)
5. 🤖 **Claude Desktop** (gratis en claude.ai/download) — u otra app que soporte MCP

---

## TERCERO: Los 4 pasos mágicos ✨

### PASO 1 — Cocinar al Obrero 👷 (se hace UNA sola vez)

Abre la ventana negra de comandos (**CMD** o **PowerShell**) y escribe:

```bat
cd C:\civil3d-mcp\bridge_csharp
dotnet build -c Release
```

Eso crea un archivo llamado:

```
C:\civil3d-mcp\bridge_csharp\bin\Release\net48\Civil3dBridge.dll
```

> 🍳 Es como hornear un pan: el `.cs` es la receta, el `.dll` es el pan listo.

**Si falla:** abre el archivo `Civil3dBridge.csproj` con el Bloc de notas y revisa que las rutas de las DLLs de Autodesk apunten a TU carpeta de Civil 3D (por ejemplo `C:\Program Files\Autodesk\AutoCAD 2024\C3D\`). Ahí también eliges `net48` (Civil 2021-2024) o `net8.0-windows` (Civil 2025+).

---

### PASO 2 — Invitar al Obrero a la fiesta 👷🎉 (dentro de Civil 3D)

1. Abre **Civil 3D**
2. En la línea de comandos escribe: `NETLOAD` y presiona Enter
3. Se abre un explorador → busca y selecciona tu `Civil3dBridge.dll` (la del Paso 1)
4. Ahora escribe: `CIVILMCPLISTEN` y presiona Enter

✅ Deberías ver algo como *"Bridge escuchando en puerto 8765"*.

> 📞 ¡El Obrero ya contestó el teléfono! Ahora espera llamadas del Traductor.

⚠️ Cada vez que cierres Civil 3D, hay que repetir este paso (es solo escribir 2 cositas).

---

### PASO 3 — Instalarle juguetes al Traductor 🧑‍💼 (se hace UNA sola vez)

En la ventana negra de comandos:

```bat
pip install "mcp[cli]"
```

Listo. El Traductor ya sabe hablar el idioma del Robot.

---

### PASO 4 — Presentar al Robot con el Traductor 🤝🌐 (se hace UNA sola vez)

1. Abre **Claude Desktop**
2. Menú **☰ → Settings → Developer → Edit Config** (te pide permiso, di que sí)
3. Se abre un archivo `claude_desktop_config.json`. Déjalo así (cambia la ruta por donde TÚ guardaste la carpeta):

```json
{
  "mcpServers": {
    "civil3d": {
      "command": "python",
      "args": ["C:\\civil3d-mcp\\server\\server.py"]
    }
  }
}
```

4. Guarda el archivo (Ctrl+S) y **reinicia Claude Desktop** (ciérralo de verdad, no solo la ventanita).
5. Busca en la esquina de abajo el ícono 🔌 de "MCP" → si sale `civil3d` con lucecita verde, ¡funciona! 🟢

---

## CUARTO: ¡A JUGAR! 🎮

Escríbele a Claude algo así:

> *"Conéctate a Civil 3D y dime el estado"*

Y luego cosas como:

> *"Lee los puntos del dibujo y crea una superficie TIN llamada TERRENO"*
> *"Traza una alineación horizontal desde (0,0) hasta (500,0) con curva de radio 200"*

Robot 🤖 → nota → Traductor 🧑‍💼 → telefonema → Obrero 👷 → ¡aparece dibujado en tu Civil 3D! 🪄

---

## QUINTO: Si algo sale mal 😿 (los clásicos)

| Síntoma | Causa probable | Medicina 💊 |
|---|---|---|
| "No se pudo conectar al bridge" | Olvidaste el Paso 2 | Abre Civil 3D → `NETLOAD` → `CIVILMCPLISTEN` |
| `dotnet no se reconoce` | No instalaste el .NET SDK | Instálalo y reinicia la ventana negra |
| `python no se reconoce` | No marcaste "Add to PATH" | Reinstala Python marcando la casillita ✅ |
| Al compilar no encuentra las DLLs de Autodesk | Ruta equivocada en el `.csproj` | Ábrelo con Bloc de notas y corrige la ruta a tu versión |
| Claude no ve el servidor MCP | Error de sintaxis en el JSON o no reiniciaste Claude | Revisa comas y llaves; cierra Claude COMPLETO y ábrelo |
| Todo funciona pero Civil 3D se "congela" un momento | Normal: las operaciones corren dentro de Civil | Paciencia, es como esperar que termine de calcular 😄 |

---

## EL RESUMEN DEL RESUMEN 🥜

1. **Una sola vez:** compila el Obrero (Paso 1), instala Python's cosas (Paso 3), configura Claude (Paso 4).
2. **Cada sesión de trabajo:** abre Civil 3D → `NETLOAD` dll → `CIVILMCPLISTEN` (Paso 2).
3. **Después:** solo chatea con Claude y mira cómo dibuja solo. 🪄✨

*Fin del librito. ¡Recreo! 🔔*
