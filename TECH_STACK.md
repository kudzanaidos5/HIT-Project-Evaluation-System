# Tech Stack Explained

This document provides a simple explanation of the technologies used in this project.

## Frontend (The part you see and interact with)

The frontend of our application is what you see in your web browser. It's built using a collection of modern technologies to create a fast, responsive, and user-friendly experience.

- **Next.js & React:** Think of React as a toolbox full of building blocks (like buttons, forms, and menus). Next.js is a powerful toolkit that helps us arrange these blocks to build a complete house (our web application). It's known for making websites fast and easy to navigate.

- **Tailwind CSS:** This is our styling tool. Instead of writing custom CSS rules from scratch, Tailwind gives us a set of pre-built "utility classes" that we can use to style our application quickly and consistently. It's like having a set of pre-mixed paint colors that we can apply directly to our components.

- **TypeScript:** TypeScript is a "superset" of JavaScript, which means it's JavaScript with some extra features. The most important feature is "static typing," which helps us catch errors early in the development process. It's like having a grammar checker for our code.

- **Axios & TanStack Query:** These tools manage how our application gets data from the backend. Axios helps us make the actual requests (like asking for a list of students), and TanStack Query cleverly caches the data, so we don't have to ask for the same information over and over again. This makes the application feel much faster.

- **Zustand:** This is our state management library. In a complex application, we need a way to keep track of all the data that's currently being used (like who is logged in, what page they're on, etc.). Zustand provides a simple and efficient way to manage this "state."

- **React Hook Form & Zod:** These two work together to create and validate forms. React Hook Form makes it easy to build forms, and Zod lets us define a "schema" (a set of rules) to make sure the data entered into the form is correct (e.g., an email address is actually an email address).

- **Lucide-react:** This library provides a set of clean and simple icons that we use throughout the application.

- **Chart.js & react-chartjs-2:** We use these to create charts and graphs to visualize data, for example, in the analytics dashboard.

- **Next-Auth & @react-oauth/google:** These libraries handle user authentication. They make it possible for you to log in with your Google account securely.

## Backend (The engine room)

The backend is the part of our application that runs on the server. You don't see it directly, but it's responsible for all the heavy lifting, like storing data, processing business logic, and talking to the database.

- **Flask:** Flask is a lightweight and flexible Python web framework. It provides the basic tools we need to build the backend of our application without imposing a lot of structure. This gives us the freedom to design the backend exactly the way we want it.

- **Flask-SQLAlchemy & Flask-Migrate:** SQLAlchemy is a powerful tool that lets us talk to our database using Python code instead of writing raw SQL. Flask-SQLAlchemy integrates it seamlessly with Flask. Flask-Migrate helps us manage changes to our database schema over time. It's like a version control system for our database.

- **Flask-JWT-Extended:** This library provides a secure way to handle user authentication using JSON Web Tokens (JWTs). When you log in, the backend gives you a "token" that proves who you are. You then send this token with every request to access protected resources.

- **Flask-CORS:** This extension handles Cross-Origin Resource Sharing (CORS). It allows our frontend (running on a different domain) to make requests to our backend.

- **Flask-Bcrypt:** We use this to securely hash and store user passwords. We never store your actual password, only a "hash" of it. When you log in, we hash the password you entered and compare it to the stored hash.

- **Marshmallow:** Marshmallow is a library for "serialization" and "deserialization." This means it converts complex data (like our Python objects) into a format that can be easily sent over the network (like JSON) and vice versa.

- **ReportLab:** This library allows us to generate PDF documents, for example, for creating reports.
