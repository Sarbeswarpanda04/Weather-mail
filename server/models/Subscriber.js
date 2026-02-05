import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        subscribedAt: {
            type: Date,
            default: () => new Date(),
        },
        updatedAt: {
            type: Date,
            default: () => new Date(),
        },
        paused: {
            type: Boolean,
            default: false,
        },
        pauseReason: {
            type: String,
            default: "",
            trim: true,
        },
        lastSentAt: {
            type: Date,
        },
        welcomeSentAt: {
            type: Date,
        },
    },
    {
        collection: "subscribers",
    }
);

subscriberSchema.pre("save", function updateTimestamp(next) {
    this.updatedAt = new Date();
    next();
});

subscriberSchema.index({ paused: 1 });

const Subscriber = mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);

export default Subscriber;
