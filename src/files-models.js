const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    path: { type: String, default: undefined },
    description: { type: String, default: undefined },
    text: { type: mongoose.Schema.Types.Mixed, default: undefined },
    tags: { type: [String], default: undefined },
    accesses: { type: [String], default: undefined },

    resolved: {
        accesses: { type: [String], default: undefined },
        path: { type: String, default: undefined },
        storagePath: { type: String, default: undefined },
    },
});
fileSchema.index({ filename: 1 }, { unique: true });
fileSchema.index({ 'resolved.path': 1 }, { unique: false });

const albumSchema = new mongoose.Schema({
    path: { type: String, required: true },
    title: { type: String, default: undefined },
    text: { type: mongoose.Schema.Types.Mixed, default: undefined },
    defaultByDate: { type: Boolean, default: undefined },
    accesses: { type: [String], default: undefined },
    defaultAccesses: { type: [String], default: undefined },
    order: { type: Number, default: undefined },

    resolved: {
        accesses: { type: [String], default: undefined },
        title: { type: String, default: undefined },
        order: { type: Number, default: undefined },
    },
});
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
