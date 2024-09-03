import Path from "path";
import express from "express";

// import { Compression } from "./bluemap/storage/compression/compression";
// import { FileStorage } from "./bluemap/storage/file/file_storage";
// import {URL} from "url";


export const requestFileHandler = () => {

    const app = express.Router();


    app.use((req, res, next) => {
        console.log(`${new Date()} ${req.method} ${req.path}`);
        next();
    });
    
    
    if (!process.env.WEBSERVER_ROOT) {
        console.error(`Must specify webserver root in environment.`)
        console.error(`WEBSERVER_ROOT = ..path to bluemap/web/..`)
        process.exit(1);
    }
    const ROOT = Path.resolve(process.env.WEBSERVER_ROOT);
    
    // const fileStorage = new FileStorage(Path.resolve(ROOT, "maps"), "gzip", true);
    
    // (async () => {
    //     console.log(await fileStorage.mapIds());
    // })();
    
    
    app.get("*.json", (req, res, next) => {
    
        if (req.url.includes("textures.json") ) {
            req.url = req.url.replace(".json", ".json.gz");
            res.set("Content-Encoding", "gzip");
            res.set("Content-Type", "application/json");
        }
        next();
    });
    
    app.get("*.prbm", (req, res, next) => {
        
        console.log(req.path);
    
        req.url = req.url.replace(".prbm", ".prbm.gz");
        res.set("Content-Encoding", "gzip");
        res.set("Content-Type", "application/json");
    
        next();
        // const regx = /tiles\/([\d/]+)\/x(-?[\d/]+)z(-?[\d/]+).*/g
    
    })
    
    // TODO: app.get(*/live/*) -> redirect (optionally) to internal bluemaps webserver.
    
    app.use("/", express.static(ROOT, {fallthrough: true}));
    
    app.use((req, res, next) => {
        res.status(204)
        res.send();
    })

    return app;
};