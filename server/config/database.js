import mongoose from "mongoose";

let databaseReady = false;
let hasWarnedMissingUri = false;

const getDatabaseName = () => process.env.MONGODB_DB ?? "weathermail";

const getMongoUri = () => process.env.MONGODB_URI;

const setReadyState = (state) => {
    databaseReady = state;
};

const log = {
    info: (message) => console.log(`[database] ${message}`),
    warn: (message) => console.warn(`[database] ${message}`),
    error: (message, error) => console.error(`[database] ${message}`, error),
};

const attachListeners = () => {
    const connection = mongoose.connection;

    connection.on("connected", () => {
        setReadyState(true);
        log.info(`Connected to MongoDB database "${getDatabaseName()}"`);
    });

    connection.on("disconnected", () => {
        setReadyState(false);
        log.warn("MongoDB connection lost. Pending jobs will be skipped until reconnection.");
    });

    connection.on("error", (error) => {
        setReadyState(false);
        log.error("MongoDB connection error", error);
    });
};

const connectDatabase = async () => {
    const uri = getMongoUri();

    if (!uri) {
        if (!hasWarnedMissingUri) {
            log.warn("MONGODB_URI missing. Falling back to in-memory subscription storage.");
            hasWarnedMissingUri = true;
        }
        return;
    }

    try {
        mongoose.set("strictQuery", true);
        attachListeners();

        await mongoose.connect(uri, {
            dbName: getDatabaseName(),
            serverSelectionTimeoutMS: 10_000,
        });
    } catch (error) {
        setReadyState(false);
        log.error("Failed to connect to MongoDB", error);
    }
};

const isDatabaseReady = () => databaseReady;

const __testing = {
    setReadyState,
};

export { connectDatabase, isDatabaseReady, __testing };
