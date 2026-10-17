import connectDB from "./db/index.js";
import Auth from "./models/auth.model.js";

const createUser = async () => {
  try {
    await connectDB();

    const email = "abdushs54@gmail.com";
    const password = "abdushs54@";

    const existingUser = await Auth.findOne({ where: { email } });

    if (existingUser) {
      console.log("User already exists with this email");
      console.log("User ID:", existingUser.id);
      console.log("Email:", existingUser.email);
      process.exit(0);
    }

    const user = await Auth.create({
      email,
      password,
      isAdmin: false,
    });

    console.log("User created successfully");
    console.log("User ID:", user.id);
    console.log("Email:", user.email);
    console.log("Password hash:", user.password);

    process.exit(0);
  } catch (error) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  }
};

createUser();