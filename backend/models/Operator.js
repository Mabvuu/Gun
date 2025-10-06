const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

module.exports = mongoose.model("Operator", operatorSchema);
