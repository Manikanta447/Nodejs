const express = require("express");
const sqlite3 = require("sqlite3");
const {open} = require("sqlite");
const path = require("path");
const app = express();
let db = null;

const databasePath = path.join(__dirname,"goodreads.db");

const initializeDbAndServer = async () => {
    try{
        db = await open({
            filename:databasePath,
            driver:sqlite3.Database
        });
        app.listen(3000,() => {
            console.log("Server is started at http://localhost:3000/");
        })
    }catch(error){
        console.log(error.meassage);
        process.exit(1);
    }
}
