const express = require('express')
var cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express()
const port = 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ndbz4pp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(cors())
app.use(express.json())

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // all route here
    const usersCollection = client.db("RedConnect").collection("users")
    const donationsCollection = client.db("RedConnect").collection("donation_requests")
    const fundingCollection = client.db("RedConnect").collection("fund")
    const blogsCollection = client.db("RedConnect").collection("blogs")


    //Test
    app.get('/', async (req, res) => {
      res.send("the server is runnning")
    });


    // Register endpoint
    app.post('/api/users/register', async (req, res) => {
      try {
        const { email, firebaseId, name, avatar, bloodGroup, district, upazila } = req.body;

        // Check if user exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
        }

        // Insert new user
        const newUser = {
          firebaseId,
          name,
          email,
          avatar,
          bloodGroup,
          district,
          upazila,
          role: 'donor',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: 'User created', userId: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.get('/api/users', async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) return res.status(400).json({ message: 'Email query is required' });

        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Remove sensitive info if needed
        delete user.password;
        res.status(200).json(user);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.put('/api/users', async (req, res) => {
      try {
        const email = req.query.email;
        const updateData = req.body;

        if (!email) return res.status(400).json({ message: 'Email query is required' });

        // Do not allow updating email
        delete updateData.email;
        delete updateData._id;

        const result = await usersCollection.updateOne(
          { email },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = await usersCollection.findOne({ email });
        delete updatedUser.password; // remove password from response

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.get('/api/usersall', async (req, res) => {
      try {

        const user = await usersCollection.find().toArray();
        res.status(200).json(user);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.get("/role", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }

      try {
        // Find user by email
        const user = await usersCollection.findOne(
          { email },
          { projection: { role: 1, _id: 0 } } // Only return the role field
        );

        if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
          success: true,
          email,
          role: user.role || "donor", // default fallback if needed
        });
      } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    app.put("/api/block", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).json({ success: false, message: "Email is required" });

      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: { status: "blocked" } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "User blocked successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to block user" });
      }
    });

    // Unblock a user
    app.put("/api/unblock", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).json({ success: false, message: "Email is required" });

      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: { status: "active" } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "User unblocked successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to unblock user" });
      }
    });

    // Update user role
    app.put("/api/role", async (req, res) => {
      const email = req.query.email;
      const role = req.query.role;
      if (!email || !role) return res.status(400).json({ success: false, message: "Email and role are required" });

      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: { role } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: `User role updated to ${role}` });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to update role" });
      }
    });


    app.post('/api/donation-requests', async (req, res) => {
      try {
        const request = { ...req.body, createdAt: new Date() };
        const result = await donationsCollection.insertOne(request);
        res.status(201).json({ success: true, requestId: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create donation request' });
      }
    });

    // Get All pending Donation Requests (for testing)
    app.get('/api/donation-requests', async (req, res) => {
      try {
        const requests = await donationsCollection.find({ status: "pending" }).toArray();
        res.json(requests);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch donation requests' });
      }
    });

    //get all
    app.get('/api/donation-requestsall', async (req, res) => {
      try {
        const requests = await donationsCollection.find({}).toArray();
        res.json(requests);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch donation requests' });
      }
    });

    app.get("/api/donation-requests/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const request = await donationsCollection.findOne({ _id: new ObjectId(id) });
        if (!request) {
          return res.status(404).json({ message: "Donation request not found" });
        }
        res.json(request);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // ✅ Confirm donation: set status to inprogress & add donor info
    app.put("/api/donation-requests/:id/confirm", async (req, res) => {
      try {
        const { id } = req.params;
        const { donorName, donorEmail } = req.body;

        if (!donorName || !donorEmail) {
          return res.status(400).json({ message: "Donor name & email required" });
        }


        const updateResult = await donationsCollection.updateOne(
          { _id: new ObjectId(id), status: "pending" }, // only if still pending
          {
            $set: {
              status: "inprogress",
              donorInfo: { name: donorName, email: donorEmail },
            },
          }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(400).json({
            message: "Request not found or not in pending status",
          });
        }

        res.json({ message: "Donation confirmed successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
      }
    });


    //change status 
    // ✅ Confirm donation: set status to inprogress & add donor info
    app.put("/api/donation-requests/:id/status", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        const updateResult = await donationsCollection.updateOne(
          { _id: new ObjectId(id), status: "inprogress" }, // only if still pending
          {
            $set: {
              status: status,
            },
          }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(400).json({
            message: "Request not found or not in pending status",
            done: fasle
          });
        }

        res.json({ message: "Donation confirmed successfully", done: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error", done: false });
      }
    });

    app.get("/api/recent", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).json({ message: "Email query is required" });
        }

        const recentRequests = await donationsCollection
          .find({ requesterEmail: email })
          .sort({ createdAt: -1 })      // newest first
          .limit(3)
          .toArray();

        res.json(recentRequests);
      } catch (err) {
        console.error("Error fetching recent donation requests:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/api/recentall", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).json({ message: "Email query is required" });
        }

        const recentRequests = await donationsCollection
          .find({ requesterEmail: email })
          .sort({ createdAt: -1 })      // newest first
          .toArray();

        res.json(recentRequests);
      } catch (err) {
        console.error("Error fetching recent donation requests:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/api/donation-requests/:id", async (req, res) => {
      // <-- Make sure you set db in app.locals when connecting
      const { id } = req.params;

      try {
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid request ID" });
        }

        const result = await donationsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Donation request not found" });
        }

        res.status(200).send(result);
      } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.patch("/api/donation-requests/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: "Invalid request ID" });
        }

        // Remove _id if sent from frontend to avoid immutable field error
        const { _id, ...updateFields } = req.body;

        // Add an updatedAt timestamp if you want to track updates
        const updateDoc = {
          $set: {
            ...updateFields,
            updatedAt: new Date(),
          },
        };

        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          updateDoc
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ success: false, message: "Donation request not found" });
        }

        res.status(200).json({ success: true, message: "Donation request updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          success: false,
          message: "Failed to update donation request",
        });
      }
    });

    app.get("/api/admin/dashboard-stats", async (req, res) => {
      try {
        // total registered users (donors)
        const totalUsers = await usersCollection.countDocuments({ role: "donor" });

        // total funding amount (sum of all amounts in fundings collection)
        const fundingAgg = await fundingCollection.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]).toArray();

        const totalFunding = fundingAgg[0]?.total || 0;

        // total blood donation requests
        const totalDonationRequests = await donationsCollection.countDocuments();

        res.json({
          totalUsers,
          totalFunding,
          totalDonationRequests
        });
      } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Failed to load dashboard stats" });
      }
    });

    app.get("/api/blogs", async (req, res) => {
      try {
        const blogs = await blogsCollection.find({}).toArray();
        res.json(blogs);
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch blogs" });
      }
    });

    app.get("/api/blogs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const blogs = await blogsCollection.find({ _id: new ObjectId(id) }).toArray();
        res.json(blogs);
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch blogs" });
      }
    });

    // POST a new blog
    app.post("/api/blogs", async (req, res) => {
      try {
        const blog = { ...req.body, createdAt: new Date() };
        const result = await blogsCollection.insertOne(blog);
        res.status(201).json({ success: true, blogId: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to create blog" });
      }
    });

    // PUT update blog status (publish/unpublish)
    app.put("/api/blogs/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body; // 'draft' or 'published'
      try {
        await blogsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.json({ success: true, message: "Blog status updated" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to update status" });
      }
    });

    // DELETE a blog
    app.delete("/api/blogs/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await blogsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true, message: "Blog deleted" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to delete blog" });
      }
    });

    app.get("/api/search-donors", async (req, res) => {
      try {
        const { bloodGroup, district, upazila } = req.query;

        // validate
        if (!bloodGroup || !district || !upazila) {
          return res.status(400).json({ message: "bloodGroup, district, and upazila are required" });
        }

        // Build query
        const query = {
          bloodGroup,
          district,
          upazila,
          status: "active",        // optional: only active donors
          role: "donor",           // optional: only real donors
        };

        const donors = await usersCollection     // your donors are inside users collection
          .find(query)
          .project({
            name: 1,
            email: 1,
            bloodGroup: 1,
            district: 1,
            upazila: 1,
          })
          .toArray();

        res.json(donors);
      } catch (err) {
        console.error("Error searching donors:", err);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { amount } = req.body
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount, // Amount in smallest currency unit (e.g., cents)
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.json({
          clientSecret: paymentIntent.client_secret
        });
      } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/fundings", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await fundingCollection.countDocuments();
        const totalFundsAgg = await fundingCollection
          .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
          .toArray();
        const totalFunds = totalFundsAgg[0]?.total || 0;

        const fundings = await fundingCollection
          .find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();


        res.json({
          fundings,
          total,
          totalFunds,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        });
      } catch (err) {
        console.error("Error fetching fundings:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.post("/api/fundings", async (req, res) => {
      try {
        const funding = { ...req.body, date: new Date() };
        const result = await fundingCollection.insertOne(funding);
        res.status(201).json({ success: true, fundingId: result.insertedId });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    });

    app.get("/api/check-block", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }

        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (user.status === "blocked") {
          return res.json({ blocked: true, message: "User is blocked" });
        }

        res.json({ blocked: false, message: "User is active" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });






  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
