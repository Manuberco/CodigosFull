// Civil3dBridge.cs — NETLOAD add-in para AutoCAD/Civil 3D 2022+
// Compilar como DLL .NET (Framework 4.8 o .NET 8 "Windows" según versión):
//   dotnet build -c Release   (ver Civil3dBridge.csproj)
//
// Uso dentro de Civil 3D:
//   NETLOAD -> Civil3dBridge.dll
//   CIVILMCPLISTEN     (inicia listener TCP en 127.0.0.1:8765)
//   CIVILMCPSTOP       (lo detiene)
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using CivilApp = Autodesk.Civil.ApplicationServices.CivilDocument;
using Autodesk.Civil.DatabaseServices;

[assembly: CommandClass(typeof(Civil3dBridge.Plugin))]

namespace Civil3dBridge
{
    public class Plugin
    {
        static TcpListener _listener;
        static Thread _thread;

        [CommandMethod("CIVILMCPLISTEN")]
        public void StartListener()
        {
            if (_listener != null) { Write("Ya está corriendo."); return; }
            _listener = new TcpListener(IPAddress.Loopback, 8765);
            _listener.Start();
            _thread = new Thread(AcceptLoop) { IsBackground = true };
            _thread.Start();
            Write("Bridge MCP escuchando en 127.0.0.1:8765");
        }

        [CommandMethod("CIVILMCPSTOP")]
        public void StopListener()
        {
            try { _listener?.Stop(); } catch { }
            _listener = null;
            Write("Bridge detenido.");
        }

        static void Write(string s) =>
            Application.DocumentManager.MdiActiveDocument?.Editor
                .WriteMessage("\n[MCP] " + s);

        static void AcceptLoop()
        {
            while (_listener != null)
            {
                try
                {
                    using var client = _listener.AcceptTcpClient();
                    using var sr = new System.IO.StreamReader(client.GetStream(), Encoding.UTF8);
                    string line = sr.ReadLine();
                    string reply = Dispatcher.Run(line);
                    byte[] bytes = Encoding.UTF8.GetBytes(reply + "\n");
                    client.GetStream().Write(bytes, 0, bytes.Length);
                }
                catch when (_listener == null) { return; } // detenido
                catch (Exception ex) { Write(ex.Message); }
            }
        }
    }

    // Ejecuta el JSON en el hilo de UI de AutoCAD (obligatorio para la API).
    static class Dispatcher
    {
        public static string Run(string jsonRequest)
        {
            string result = "{\"ok\":false,\"error\":\"timeout\"}";
            var doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null)
                return "{\"ok\":false,\"error\":\"No hay documento abierto\"}";

            doc.ExecuteInApplicationContext(_ =>
            {
                result = Handlers.Handle(jsonRequest);
            }, null);
            return result;
        }
    }

    static class Handlers
    {
        // Parser JSON mínimo basado en DataContractJson alternativamente;
        // aquí se asume uso de System.Text.Json (disponible vía NuGet).
        public static string Handle(string req)
        {
            try
            {
                using var d = System.Text.Json.JsonDocument.Parse(req);
                string cmd = d.RootElement.GetProperty("cmd").GetString();
                var p = d.RootElement.TryGetProperty("params", out var pp)
                        ? pp : System.Text.Json.JsonDocument.Parse("{}").RootElement;
                var data = Dispatch(cmd, p);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return "{\"ok\":false,\"error\":" +
                       System.Text.Json.JsonSerializer.Serialize(ex.Message) + "}";
            }
        }

        static object Dispatch(string cmd, System.Text.Json.JsonElement p)
        {
            var doc = Application.DocumentManager.MdiActiveDocument;
            var db = doc.Database;
            var civil = CivilApp.GetCivilDocument(db);

            switch (cmd)
            {
                case "ping":
                    return new { version = Application.Version, product = "Civil3DBridge" };

                case "get_drawing_info":
                    return new
                    {
                        file = doc.Name,
                        units = (int)db.Insunits,
                        points = civil.PointGroups.Count,
                        alignments = civil.GetAlignmentIds().Count,
                        surfaces = civil.GetSurfaceIds().Count,
                        corridors = civil.GetCorridorIds().Count,
                    };

                case "create_point":
                    return CreatePoint(db,
                        p.GetProperty("x").GetDouble(),
                        p.GetProperty("y").GetDouble(),
                        p.GetProperty("z").GetDouble(),
                        Str(p, "descr"));

                case "create_points_batch":
                {
                    int n = 0;
                    foreach (var pt in p.GetProperty("points").EnumerateArray())
                    {
                        CreatePoint(db, pt.GetProperty("x").GetDouble(),
                                       pt.GetProperty("y").GetDouble(),
                                       pt.TryGetProperty("z", out var z) ? z.GetDouble() : 0,
                                       Str(pt, "descr"));
                        n++;
                    }
                    return new { created = n };
                }

                case "list_points":
                {
                    var list = new List<object>();
                    using var tr = db.TransactionManager.StartTransaction();
                    foreach (ObjectId id in civil.GetPointGroups())
                    {
                        var pg = (PointGroup)tr.GetObject(id, OpenMode.ForRead);
                        foreach (ObjectId pid in pg.GetPointIds())
                        {
                            var cpt = (Autodesk.Civil.DatabaseServices.Point)tr.GetObject(pid, OpenMode.ForRead);
                            list.Add(new { number = cpt.Number, x = cpt.X, y = cpt.Y,
                                           z = cpt.Z, descr = cpt.RawDescription });
                            if (list.Count >= p.GetProperty("max").GetInt32()) break;
                        }
                    }
                    tr.Commit();
                    return new { count = list.Count, points = list };
                }

                case "create_alignment":
                    return CreateAlignment(db, civil, Str(p, "name"),
                        Doubles(p, "stations"), Doubles(p, "elevations"));

                case "create_surface":
                    return CreateSurface(db, civil, Str(p, "name"),
                        p.GetProperty("tinslope").GetDouble());

                case "run_command":
                {
                    string c = p.GetProperty("command").GetString();
                    doc.SendStringToExecute(c + "\n", true, false, false);
                    return new { sent = c };
                }

                default:
                    throw new Exception("Comando desconocido: " + cmd);
            }
        }

        // ---------- implementaciones ----------

        static object CreatePoint(Database db, double x, double y, double z, string descr)
        {
            using var tr = db.TransactionManager.StartTransaction();
            var pt = new Autodesk.Civil.DatabaseServices.Point(
                NextPointNumber(tr, db), new Point3d(x, y, z),
                descr ?? "", StyleSettings.PointStyleNameAuto(tr, db));
            var blk = (BlockTableRecord)tr.GetObject(SymbolService.ShowLastValidBlockTableRecord(db), OpenMode.ForWrite);
            blk.AppendEntity(pt);
            tr.AddNewlyCreatedDBObject(pt, true);
            tr.Commit();
            return new { handle = pt.Handle.ToString(), number = pt.Number };
        }

        static uint NextPointNumber(Transaction tr, Database db)
        {
            var ps = Autodesk.Civil.DatabaseServices.Point.Create(tr, db);
            return ps.NextPointNumber;
        }

        static object CreateAlignment(Database db, CivilApp.CivilDocument civil,
            string name, List<double> xs, List<double> ys)
        {
            using var tr = db.TransactionManager.StartTransaction();
            var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);
            var btr = (BlockTableRecord)tr.GetObject(bt[BlockTableRecord.ModelSpace], OpenMode.ForWrite);

            var pline = new Polyline();
            for (int i = 0; i < xs.Count; i++)
                pline.AddVertexAt(i, new Point2d(xs[i], ys[i]), 0, 0, 0);
            btr.AppendEntity(pline);
            tr.AddNewlyCreatedDBObject(pline, true);

            var align = Alignment.Create(civil, name, pline.ObjectId,
                AlignmentType.Freeway, 0.0, "Alignment Style", "Alignment Label Set");
            tr.Commit();
            return new { handle = align.Handle.ToString(), name = align.Name };
        }

        static object CreateSurface(Database db, CivilApp.CivilDocument civil,
            string name, double tinSlope)
        {
            using var tr = db.TransactionManager.StartTransaction();
            var surf = TinSurface.Create(civil, name, "Surface Style", tinSlope);
            tr.Commit();
            return new { handle = surf.Handle.ToString(), name = surf.Name };
        }

        // ---------- helpers ----------
        static string Str(System.Text.Json.JsonElement e, string k) =>
            e.TryGetProperty(k, out var v) ? v.GetString() : "";
        static List<double> Doubles(System.Text.Json.JsonElement e, string k)
        {
            var l = new List<double>();
            foreach (var v in e.GetProperty(k).EnumerateArray()) l.Add(v.GetDouble());
            return l;
        }
        static string Ok(object data) =>
            "{\"ok\":true,\"data\":" + System.Text.Json.JsonSerializer.Serialize(data) + "}";
    }
}
