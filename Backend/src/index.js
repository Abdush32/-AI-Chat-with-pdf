import connectDB from "./db/index.js";
import {app} from "./app.js";

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
