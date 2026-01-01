const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
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


    // ১. বুকিং কালেকশন তৈরি করুন
const bookingCollection = client.db('GoBeyond').collection('bookings');

// ২. বুকিং পোস্ট করার API (বুকিং সেভ + বুকিং কাউন্ট বৃদ্ধি)
app.post('/bookings', async (req, res) => {
    const bookingData = req.body;
    const { ObjectId } = require('mongodb');

    // স্টেপ ১: বুকিং ডেটাbookings কালেকশনে সেভ করা
    const bookingResult = await bookingCollection.insertOne(bookingData);

    // স্টেপ ২: ওই নির্দিষ্ট ট্যুর প্যাকেজের bookingCount ১ বাড়ানো ($inc ব্যবহার করে)
    const filter = { _id: new ObjectId(bookingData.tour_id) };
    const updateDoc = {
        $inc: { bookingCount: 1 } // এখানে ১ যোগ হবে অটোমেটিক
    };

    const updateResult = await tourCollection.updateOne(filter, updateDoc);

    // দুইটার রেজাল্ট একসাথে পাঠানো
    res.send({ bookingResult, updateResult });
});

// ৩. ইউজারের নিজের বুকিংগুলো দেখার API (My Bookings পেজের জন্য)
app.get('/myBookings', async (req, res) => {
    const email = req.query.email; // কুয়েরি প্যারামিটার হিসেবে ইমেইল আসবে
    const query = { buyer_email: email };
    const result = await bookingCollection.find(query).toArray();
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