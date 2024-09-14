const Userschema = require("../Model/userSchema");
const RationaleSchema = require("../Model/RationaleSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const xlsx = require("xlsx");
const fs = require("fs");
const mongoose = require("mongoose");

const object = {
  // Signup function
  signup: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const existingUser = await Userschema.findOne({ email });

      if (existingUser) {
        res.status(400).json({ message: "Email is already in use" });
      } else {
        //bcryting password
        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = new Userschema({
          username,
          email,
          password: hashPassword,
        });
        await newUser.save();

        //Token generation
        const token = jwt.sign({ email }, process.env.JWT_KEY, {
          expiresIn: 1 * 24 * 60 * 60, // 1 day
        });
        res.status(200).json({ message: "Signup success", token });
      }
    } catch (error) {
      console.error("Signup Error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  },

  // Login function
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const existingUser = await Userschema.findOne({ email });

      if (!existingUser) {
        return res
          .status(400)
          .json({ message: `User not found with email ${email}` });
      }

      const passCheck = bcrypt.compareSync(password, existingUser.password);
      if (!passCheck) {
        return res.status(400).json({ message: "Password does not match" });
      }

      const token = jwt.sign({ email }, process.env.JWT_KEY, {
        expiresIn: 1 * 24 * 60 * 60,
      });
      return res.status(200).json({ message: "Login Success", token });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  },

  addrationale: async (req, res) => {
    try {
      const {
        module,
        rationaleSummary,
        rationaleText,
        enable,
        rationaleID,
        groupID,
        sequence,
      } = req.body;
      //checking is the rationale exisiting
      const CheckPreviousUser = await RationaleSchema.findOne({ rationaleID });
      if (CheckPreviousUser) {
        res.status(400).json({ message: "User With same Rationale Id Exists" });
      } else {
        //adding new rationale to the database.
        const newRationale = new RationaleSchema({
          Module: module,
          RationaleSummary: rationaleSummary,
          RationaleText: rationaleText,
          Enable: enable,
          RationaleID: rationaleID,
          GroupID: groupID,
          Sequence: sequence,
        });
        await newRationale.save();
        return res
          .status(200)
          .json({ message: "Rationale added successfully" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to add new rationale" });
    }
  },
  //fecthing the rationale data
  showRationale: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalDocuments = await RationaleSchema.countDocuments();
      const totalPages = Math.ceil(totalDocuments / limit);

      const rationaleData = await RationaleSchema.find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);
      res.status(200).json({
        message: "rationale data fetched successfully",
        rationaleData,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to get rationale Data" });
    }
  },

  // XLSX to mongoDb  function
  xlsxToDb: async (req, res) => {
    const filePath =
      "C:\\Users\\User\\Downloads\\Rationale List Manager - Data (1).xlsx";
    try {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      // Read the Excel file
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      // Loop through each sheet in the workbook
      for (const sheetName of sheetNames) {
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Define the collection name by removing spaces
        const collectionName = sheetName.replace(/\s/g, "");

        // Check if the collection already exists, otherwise create it
        if (mongoose.connection.models[collectionName]) {
          console.log(
            `'${collectionName}' already exists.`
          );
        } else {
          // Create a dynamic schema for each collection
          const schema = new mongoose.Schema({}, { strict: false });
          const collection = mongoose.connection.model(collectionName, schema);

          // Insert data into the collection
          const insertedData = await collection.insertMany(sheetData);
          console.log(
            `Inserted ${insertedData.length} documents into '${collectionName}' collection.`
          );
        }
      }
      res
        .status(200)
        .json({ message: "All sheets  successfully Added into database" });
    } catch (error) {
      console.error("Error in adding Excel file:", error.message);
      res.status(500).json({ error: "Failed to add Excel file" });
    }
  },
};

module.exports = object;
