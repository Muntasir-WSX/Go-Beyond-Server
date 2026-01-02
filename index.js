const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); 
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
    // await client.connect(); 

    const tourCollection = client.db('GoBeyond').collection('tourpackages');
    const bookingCollection = client.db('GoBeyond').collection('bookings');

    //  1. all tour packages API
    app.get('/tourPackages', async (req, res) => {
      const result = await tourCollection.find().toArray();
      res.send(result);
    });

    // ২. singele tour package API
    app.get('/tourpackages/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tourCollection.findOne(query);
      res.send(result);
    });

    // ৩. Post Bokking (Booking save + Booking count update)
    app.post('/bookings', async (req, res) => {
      const bookingData = req.body;
      
      
      const newBooking = {
        ...bookingData,
        status: 'pending',
        booking_date: new Date() 
      };

      const bookingResult = await bookingCollection.insertOne(newBooking);

      // Booking count update
      const filter = { _id: new ObjectId(bookingData.tour_id) };
      const updateDoc = { $inc: { bookingCount: 1 } };
      const updateResult = await tourCollection.updateOne(filter, updateDoc);

      res.send({ bookingResult, updateResult });
    });

    // ৪. User's own bookings API (with package details)

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
                // if needed, convert tour_id to ObjectId
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
                $unwind: "$packageInfo" 
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    booking_date: 1,
                    buyer_contact: 1,
                    notes: 1,
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

    // 5. Booking status update (Confirm/Complete Button)
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'completed' },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ৬. all bookings 
    app.get('/allBookings', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    // ৭. NEW tOUR PACKAGE ADD API (PRIVATE)
    app.post('/tourPackages', async (req, res) => {
    const packageData = req.body;
    const newPackage = {
        ...packageData,
        bookingCount: 0,
        created_at: new Date()
    };
    const result = await tourCollection.insertOne(newPackage);
    res.send(result);
});

    // ৮. নির্দিষ্ট গাইডের নিজস্ব প্যাকেজগুলো পাওয়ার API (Manage My Packages এর জন্য)
    app.get('/myPackages', async (req, res) => {
        const email = req.query.email;
        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }
        const query = { guide_email: email }; 
        const result = await tourCollection.find(query).toArray();
        res.send(result);
    });

    // ৯. প্যাকেজ ডিলিট করার API
    app.delete('/tourPackages/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await tourCollection.deleteOne(query);
        res.send(result);
    });

    // ১০. প্যাকেজ আপডেট করার API (PATCH)
    app.patch('/updateTourPackage/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedData = req.body;
        
        const updateDoc = {
            $set: {
                tour_name: updatedData.tour_name,
                image: updatedData.image,
                duration: updatedData.duration,
                departure_location: updatedData.departure_location,
                destination: updatedData.destination,
                price: updatedData.price,
                departure_date: updatedData.departure_date,
                package_details: updatedData.package_details,
            },
        };

        const result = await tourCollection.updateOne(filter, updateDoc);
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