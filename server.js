const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// simply mongodb installed
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const objectID = mongodb.ObjectID;

//const dbURL = "mongodb://127.0.0.1:27017";
const dbURL = "mongodb+srv://padma:pa6789@cluster0.rkjto.mongodb.net/userDetails?retryWrites=true&w=majority";


const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 5000;
app.listen(port, () => console.log("your app is running in", port));

app.get("/", (req, res) => {
  res.send("<h1>Simple GET & POST request app..! </h1>");
});


app.post("/register", (req, res) => {
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err;
    let db = client.db("userDetails");
    db.collection("users").findOne({ email: req.body.email }, (err, data) => {
      if (err) throw err;
      if (data) {
        res.status(400).json({ message: "Email already exists..!!" });
      } else {
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(req.body.password, salt, (err, cryptPassword) => {
            if (err) throw err;
            req.body.password = cryptPassword;
            db.collection("users").insertOne(req.body, (err, result) => {
              if (err) throw err;
              client.close();
              res.status(200).json({ message: "Registration successful..!! " });
            });
          });
        });
      }
    });
  });
});

app.get("/users", authenticatedUsers, (req, res) => {
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err;
    let db = client.db("userDetails");
    db.collection("users")
      .find()
      .toArray()
      .then((data) => {
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(404).json({
          message: "No data Found or some error happen",
          error: err,
        });
      });
  });
});

app.post("/login", (req, res) => {
  mongoClient.connect(dbURL, (err, client) => {
    if (err) throw err;
    client
      .db("userDetails")
      .collection("users")
      .findOne({ email: req.body.email }, (err, data) => {
        if (err) throw err;
        if (data) {
          bcrypt.compare(req.body.password, data.password, (err, validUser) => {
            if (err) throw err;
            if (validUser) {
              jwt.sign(
                { userId: data._id, email: data.email },
                "uzKfyTDx4v5z6NSV",
                { expiresIn: "1h" },
                (err, token) => {
                  res.status(200).json({ message: "Login success..!!", token });
                }
              );
            } else {
              res
                .status(403)
                .json({ message: "Bad Credentials, Login unsuccessful..!!" });
            }
          });
        } else {
          res.status(401).json({
            message: "Email is not registered, Kindly register..!!",
          });
        }
      });
  });
});



app.get("/home", authenticatedUsers, (req, res) => {
  res
    .status(200)
    .json({ message: "Only Authenticated users can see this message..!!!" });
});

function authenticatedUsers(req, res, next) {
  if (req.headers.authorization == undefined) {
    res.status(401).json({
      message: "No token available in headers",
    });
  } else {
    jwt.verify(
      req.headers.authorization,
      "uzKfyTDx4v5z6NSV",
      (err, decodedString) => {
        if (decodedString == undefined) {
          res.status(401).json({ message: "Invalid Token" });
        } else {
          console.log(decodedString);
          next();
        }
      }
    );
  }
}