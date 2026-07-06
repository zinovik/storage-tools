const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
    { filename: { type: String, required: true } },
    { strict: false }
);
fileSchema.index({ filename: 1 }, { unique: true });

const albumSchema = new mongoose.Schema(
    { path: { type: String, required: true } },
    { strict: false }
);
albumSchema.index({ path: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    accesses: { type: [String], required: true },
    isEditAccess: { type: Boolean, required: true },
});
userSchema.index({ email: 1 }, { unique: true });

module.exports = {
    FILES_MODELS: [
        {
            filename: 'files',
            model: mongoose.model('File', fileSchema),
            sortBy: 'filename',
        },
        {
            filename: 'albums',
            model: mongoose.model('Album', albumSchema),
            sortBy: 'path',
        },
        {
            filename: 'users',
            model: mongoose.model('User', userSchema),
            sortBy: 'email',
        },
    ],
};
