# Compilar el Bridge con Visual Studio 2026 🖌️ (modo fácil)

Sí, Visual Studio sirve perfectamente. Solo sigue estos pasos:

## Paso 1 — Abrir el proyecto
1. Abre Visual Studio 2026.
2. **Archivo → Abrir → Proyecto/Solución...**
3. Navega a tu carpeta y selecciona `bridge_csharp\Civil3dBridge.csproj`.
4. Si VS pregunta algo sobre cargas o paquetes, acepta todo.

> ⚠️ Si VS te ofrece "Instalar .NET SDK" o un workload, dile que SÍ.

## Paso 2 — Ajustar las referencias a tus DLLs de Civil 3D
El archivo `.csproj` apunta por defecto a AutoCAD/Civil 3D **2025**. Debes decirle dónde están LAS TUYAS:

1. En el **Explorador de soluciones**, verás una rama **Dependencias → Referencias**
   con iconos ⚠️ amarillos (AcCoreMgd, AcDbMgd, AcMgd, AeccDbMgd). Eso significa
   "no encontré el archivo".
2. Haz clic derecho en cada referencia con ⚠️ → **Propiedades** y cambia la **Ruta de compilación**
   a la ubicación real de tu instalación:
   - `AcCoreMgd.dll`, `AcDbMgd.dll`, `AcMgd.dll` → `C:\Program Files\Autodesk\AutoCAD 20xx\`
   - `AeccDbMgd.dll` → `C:\Program Files\Autodesk\AutoCAD 20xx\Civil\`
   
   O más fácil: borra esas 4 referencias y vuelve a añadirlas:
   **Dependencias → Referencias → clic derecho → Agregar referencia → Examinar** y navega a esas carpetas.

### ¿Qué versión de .NET uso? (importante)
| Tu Civil 3D | TargetFramework |
|---|---|
| 2021 – 2024 | `net48` |
| 2025 o 2026 | `net8.0-windows` |

Para cambiarlo: clic derecho en el proyecto → Propiedades → **Framework de destino**.
(No aparece `net48` en la lista → instala en el instalador de VS el componente
*".NET Framework 4.8 targeting pack"*.)

## Paso 3 — Compilar
1. Arriba, donde dice **Debug**, cámbialo a **Release**.
2. Menú **Compilar → Compilar solución** (o `Ctrl+Shift+B`).
3. Debe decir: `1 correcto, 0 incorrectos`.

## Paso 4 — Ubicar la DLL y cargarla
La DLL queda en:

```
bridge_csharp\bin\Release\net8.0-windows\Civil3dBridge.dll
```
(o `...\net48\Civil3dBridge.dll` si usaste net48)

Ve a Civil 3D → `NETLOAD` → selecciona ese archivo → luego escribe `CIVILMCPLISTEN`.

Si ahora ves el mensaje de que el bridge está escuchando en el puerto 8765, ¡listo! 🎉

---

## Preguntas frecuentes

**¿Y si no veo el proyecto en VS?**
Solo hay un `.csproj` (sin `.sln`). Está bien: *Archivo → Abrir → Proyecto/Solución*
apunta directo al `.csproj` y VS te crea la solución automáticamente.

**Error: "no se puede encontrar AeccDbMgd.dll"**
Está en la subcarpeta `Civil` dentro de la carpeta de AutoCAD, no al lado del .exe.
Ejemplo: `C:\Program Files\Autodesk\AutoCAD 2025\Civil\AeccDbMgd.dll`

**Error CS0246 / tipos desconocidos al compilar**
Las referencias siguen sin apuntar a las DLLs reales (Paso 2). Revisa que no quede ningún ⚠️.

**Compila pero NETLOAD da "load exception"**
Versión .NET equivocada para tu Civil 3D. Mira la tabla del Paso 2 y recompila.
