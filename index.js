const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // ObjectId একবারে এখানে ইম্পোর্ট করুন
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect(); // প্রোডাকশনে এটি অনেক সময় দরকার হয় না, তবুও রাখতে পারেন

    const tourCollection = client.db('GoBeyond').collection('tourpackages');
    const bookingCollection = client.db('GoBeyond').collection('bookings');

    // ১. সব ট্যুর প্যাকেজ পাওয়ার API
    app.get('/tourPackages', async (req, res) => {
      const result = await tourCollection.find().toArray();
      res.send(result);
    });

    // ২. সিঙ্গেল ট্যুর প্যাকেজ API
    app.get('/tourpackages/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tourCollection.findOne(query);
      res.send(result);
    });

    // ৩. বুকিং পোস্ট করা (বুকিং সেভ + বুকিং কাউন্ট বৃদ্ধি)
    app.post('/bookings', async (req, res) => {
      const bookingData = req.body;
      
      // ডাটাবেসে সেভ করার আগে ডিফল্ট স্ট্যাটাস সেট করা ভালো
      const newBooking = {
        ...bookingData,
        status: 'pending',
        booking_date: new Date() // বুকিংয়ের সময় সেভ রাখা ভালো
      };

      const bookingResult = await bookingCollection.insertOne(newBooking);

      // ট্যুর প্যাকেজের bookingCount ১ বাড়ানো
      const filter = { _id: new ObjectId(bookingData.tour_id) };
      const updateDoc = { $inc: { bookingCount: 1 } };
      const updateResult = await tourCollection.updateOne(filter, updateDoc);

      res.send({ bookingResult, updateResult });
    });

    // ৪. ইউজারের নিজস্ব বুকিং দেখার API
// ৪. ইউজারের নিজস্ব বুকিং দেখার API (প্যাকেজ ডিটেইলস সহ)
app.get('/myBookings', async (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).send({ message: "Email is required" });
    }

    try {
        const result = await bookingCollection.aggregate([
            {
                $match: { buyer_email: email } 
            },
            {
                // আপনার tour_id যদি string হিসেবে থাকে, তবে lookup এর জন্য একে ObjectId তে রূপান্তর করতে হবে
                $addFields: {
                    tourObjectId: { $toObjectId: "$tour_id" }
                }
            },
            {
                $lookup: {
                    from: "tourpackages",      
                    localField: "tourObjectId", 
                    foreignField: "_id",        
                    as: "packageInfo"           
                }
            },
            {
                $unwind: "$packageInfo" // অ্যারে থেকে ডাটাকে বের করে সরাসরি অবজেক্ট করে দেবে
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    booking_date: 1,
                    buyer_contact: 1,
                    notes: 1,
                    // প্যাকেজ টেবিল থেকে ডাটাগুলো নিয়ে আসা হচ্ছে
                    tour_name: "$packageInfo.tour_name",
                    destination: "$packageInfo.destination",
                    departure_location: "$packageInfo.departure_location",
                    departure_date: "$packageInfo.departure_date",
                    guide_name: "$packageInfo.guide_name"
                }
            }
        ]).toArray();

        res.send(result);
    } catch (error) {
        console.error("Aggregation Error:", error);
        res.status(500).send({ message: "Error fetching detailed bookings" });
    }
});

    // ৫. বুকিং স্ট্যাটাস আপডেট (Confirm/Complete Button)
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'completed' },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ৬. সব বুকিং (Admin এর জন্য হতে পারে)
    app.get('/allBookings', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    // ৭. নতুন ট্যুর প্যাকেজ অ্যাড করার API (PRIVATE)
app.post('/tourPackages', async (req, res) => {
    const packageData = req.body;
    // ডাটাবেসে সেভ করার আগে ডেট ফরম্যাট ঠিক করা বা কাউন্ট সেট করা
    const newPackage = {
        ...packageData,
        bookingCount: 0,
        created_at: new Date()
    };
    const result = await tourCollection.insertOne(newPackage);
    res.send(result);
});

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // client.close() করার দরকার নেই
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Go Beyond Server is Running');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});