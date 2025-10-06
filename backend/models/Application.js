// backend/models/Application.js
// Robust Application model: always use the installed mongoose package for Schema/model.
// This avoids "Schema is not a constructor" when ../config/db exports something unexpected.

const mongoose = require('mongoose'); // always use the package's mongoose for Schema/model
const { Schema } = mongoose;

const HistorySchema = new Schema({
  by: { type: String, required: true },
  role: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  comment: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const DocumentSchema = new Schema({
  filename: String,
  url: String,
  uploadedBy: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const ApplicationSchema = new Schema({
  title: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, required: true },
  history: { type: [HistorySchema], default: [] },
  documents: { type: [DocumentSchema], default: [] },
  sections: { type: Schema.Types.Mixed, default: {} },
  version: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ApplicationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Avoid model overwrite errors in dev/hot-reload
module.exports = mongoose.models.Application
  ? mongoose.models.Application
  : mongoose.model('Application', ApplicationSchema);
