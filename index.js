const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

console.log(process.env.DB_PASS);



// middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173",

      "https://restaurant-manage-4ccbf.web.app",

      "https://restaurant-manage-4ccbf.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2vmm6g8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware
const logger = (req, res, next) => {
  console.log("log info", req.method, req.url);
  next();
};

const verifytoken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
  // next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const foodCollection = client.db("restaurant").collection("foods");
    const purchaseCollection = client.db("restaurant").collection("purchase");

    const userData = client.db("restaurant").collection("user");

    // auth related
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      // console.log(token)

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;

      res
        .clearCookie("token", { maxAge: 0, secure: true, sameSite: "none" })
        .send({ success: true });
    });

    // service
    app.post("/foods", async (req, res) => {
      const addfood = req.body;

      const result = await foodCollection.insertOne(addfood);
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      const cursor = foodCollection.find();
      const result = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = req.body;
      const updateproduct = {
        $set: {
          Name: update.Name,
          Category: update.Category,
          Image: update.Image,
          Origin: update.Origin,
          Quantity: update.Quantity,
          Price: update.details,
          Description: update.Description,
        },
      };
      const result = await foodCollection.updateOne(
        filter,
        updateproduct,
        options
      );
      res.send(result);
    });

    app.get("/singlefood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    // pagination

    app.get("/foodcount", async (req, res) => {
      const count = await foodCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // food purchase

    app.get("/purchase", logger, verifytoken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        res.status(403).send({ message: "forbidden access" });
        return;
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await purchaseCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/purchase", logger, async (req, res) => {
      const purchase = req.body;
      // console.log('cookee',req.cookies)
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
    });

    app.delete("/purchasee/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    // user information

    app.post("/user", async (req, res) => {
      const user = req.body;

      const result = await userData.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the, client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("restaurant server connected");
});

app.listen(port, () => {
  console.log(`restaurant server is onn good${port}`);
});
