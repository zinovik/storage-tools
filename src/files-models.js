const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
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
        rootPath: { type: String, default: undefined },
    },
});
FileSchema.index({ filename: 1 }, { unique: true });
FileSchema.index(
    { 'resolved.path': 1, 'resolved.accesses': 1 },
    { unique: false }
);
FileSchema.index(
    { 'resolved.rootPath': 1, 'resolved.accesses': 1 },
    { unique: false }
);

const AlbumSchema = new mongoose.Schema({
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
AlbumSchema.index({ path: 1 }, { unique: true });
AlbumSchema.index({ path: 1, 'resolved.accesses': 1 }, { unique: false });

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    accesses: { type: [String], required: true },
    isEditAccess: { type: Boolean, required: true },
});
UserSchema.index({ email: 1 }, { unique: true });

module.exports = {
    FILES_MODELS: [
        {
            filename: 'files',
            model: mongoose.model('File', FileSchema),
            sortBy: 'filename',
        },
        {
            filename: 'albums',
            model: mongoose.model('Album', AlbumSchema),
            sortBy: 'path',
        },
        {
            filename: 'users',
            model: mongoose.model('User', UserSchema),
            sortBy: 'email',
        },
    ],
};
