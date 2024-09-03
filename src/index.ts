import Path from "path";
import express from "express";
import dotenv from "dotenv";
import { requestSQLHandler } from "./sql";
import { requestFileHandler } from "./file";

dotenv.config();
// import { Compression } from "./bluemap/storage/compression/compression";
// import { FileStorage } from "./bluemap/storage/file/file_storage";
// import {URL} from "url";

const app = express();


app.use((req, res, next) => {
    console.log(`${new Date()} ${req.method} ${req.path}`);
    next();
});

if (process.env.STORAGE == "sql") {
    app.use(requestSQLHandler());
} else {
    app.use(requestFileHandler());
}

app.listen(3021, () => console.log("Listening on 3021"));