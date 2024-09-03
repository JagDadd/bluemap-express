import Path from "path";
import express from "express";
import fs from "fs";

import { Pool } from 'pg';

const FILE_TO_KEY: {[x: string]: string} = {
    "settings.json": "bluemap:settings",
    "textures.json": "bluemap:textures",
    "live/markers.json": "bluemap:markers",
    "live/players.json": "bluemap:players"
}

const MIME_DEFAULT = "application/octet-stream"
const MIME_TYPES: {[x: string]: string} = {
    "txt": "text/plain",
    "css": "text/css",
    "csv": "text/csv",
    "htm": "text/html",
    "html": "text/html",
    "js": "text/javascript",
    "xml": "text/xml",

    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "svg": "image/svg+xml",

    "json": "application/json",

    "mp3": "audio/mpeg",
    "oga": "audio/ogg",
    "wav": "audio/wav",
    "weba": "audio/webm",

    "mp4": "video/mp4",
    "mpeg": "video/mpeg",
    "webm": "video/webm",

    "ttf": "font/ttf",
    "woff": "font/woff",
    "woff2": "font/woff2"
}

export const requestSQLHandler = () => {

    const app = express.Router();
    
    if (!process.env.WEBSERVER_ROOT) {
        console.error(`Must specify webserver root in environment.`)
        console.error(`WEBSERVER_ROOT = ..path to bluemap/web/..`)
        process.exit(1);
    }
    const ROOT = Path.resolve(process.env.WEBSERVER_ROOT);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        keepAlive: true
    });

    app.get("/maps/*", async (req, res, next) => {
        let parts = req.path.split("/");
        let mapId = parts[2];
        let mapPath = (parts.splice(3)).join("/").split("?")[0];

        if (mapPath.startsWith("tiles/")) {

            const regx = /tiles\/([\d/]+)\/x(-?[\d/]+)z(-?[\d/]+).*/g
            let matches = Array.from(mapPath.matchAll(regx));

            let lod = matches[0][1];
            let tileX = (matches[0][2]).replace(/\//g, "");
            let tileZ = (matches[0][3]).replace(/\//g, "");

            let storage = lod == "0" ? "bluemap:hires" : `bluemap:lowres/${lod}`;

            const queryRes = await pool.query<{data: ArrayBuffer, key: "bluemap:none" | "bluemap:gzip"}>(`
                SELECT d.data, c.key
                FROM bluemap_grid_storage_data d
                INNER JOIN bluemap_map m
                 ON d.map = m.id
                INNER JOIN bluemap_grid_storage s
                 ON d.storage = s.id
                INNER JOIN bluemap_compression c
                 ON d.compression = c.id
                WHERE m.map_id = $1
                 AND s.key = $2
                 AND d.x = $3
                 AND d.z = $4
            `, [mapId, storage, tileX, tileZ]);

            if (queryRes.rowCount) {
                const result = queryRes.rows[0];
                if (result.key == "bluemap:gzip") {
                    res.setHeader("Content-Encoding", "gzip");
                }

                if (lod == "0") {
                    res.setHeader("Content-Type", "application/octet-stream");
                } else {
                    res.setHeader("Content-Type", "image/png");
                }

                res.status(200).send(result.data);
                return;
            }
            res.status(204).send();
            return;
        }

        let storage = FILE_TO_KEY[mapPath];
        if (!storage && mapPath.startsWith("assets/")) {
            storage = `bluemap:asset/${mapPath.substring(0, "assets/".length)}`;
        }

        if (storage) {
            const queryRes = await pool.query<{data: ArrayBuffer, key: "bluemap:none" | "bluemap:gzip"}>(`
                SELECT d.data, c.key
                FROM bluemap_item_storage_data d
                INNER JOIN bluemap_map m
                 ON d.map = m.id
                INNER JOIN bluemap_item_storage s
                 ON d.storage = s.id
                INNER JOIN bluemap_compression c
                 ON d.compression = c.id
                WHERE m.map_id = $1
                 AND s.key = $2
            `, [mapId, storage]);

            if (queryRes.rowCount) {
                const result = queryRes.rows[0];
                if (result.key == "bluemap:gzip") {
                    res.setHeader("Content-Encoding", "gzip");
                }

                let mime = MIME_DEFAULT;

                let i = mapPath.indexOf(".");
                let s = mapPath.indexOf("/");
                if (!(i == -1 || s == -1 || i < s)) {
                    const suffix = mapPath.substring(i + 1);
                    mime = MIME_TYPES[suffix] ?? MIME_DEFAULT;
                }

                res.setHeader("Content-Type", mime);

                res.status(200).send(result.data);

                return;
            }
        }

        res.status(404).send();

        
    });
    
    // TODO: app.get(*/live/*) -> redirect (optionally) to internal bluemaps webserver.
    
    app.use("/", express.static(ROOT, {fallthrough: true}));
    
    // app.use((req, res, next) => {
    //     res.status(204)
    //     res.send();
    // })

    return app;
};