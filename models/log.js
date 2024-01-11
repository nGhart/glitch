const mongoose = require("mongoose");

const logSchema = mongoose.Schema(
  {
    msisdn: String,
    phoneId: String,
    status_id: String,
    status: String,
    datesent: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("Log", logSchema);
