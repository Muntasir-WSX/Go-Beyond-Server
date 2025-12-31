const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;
console.log("DB User:", process.env.DB_User);
console.log("DB Pass:", process.env.DB_Password);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //tour pacage api
    const tourCollection = client.db('GoBeyond').collection('tourpackages');

    app.get('/tourPackages', async (req, res) => { 
      const cursor = tourCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //single tour package api
    app.get('/tourpackages/:id', async (req, res) => {
      const id = req.params.id;
      // সরাসরি ObjectId ইম্পোর্ট করে ব্যবহার করা ভালো
      const { ObjectId } = require('mongodb');
      const query = { _id: new ObjectId(id) };
      const result = await tourCollection.findOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get ('/', (req, res) => {
    res.send('Go Beyond Server is Running');
});

app.listen(port, () => {
    console.log(`Go Beyond Server is running on port: ${port}`);
});