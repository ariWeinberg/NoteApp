# Frontend Dockerfile
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .

# Copy the application files
COPY . .
RUN rm -rf node_modules package-lock.json
RUN npm install


# Build the React app for production
#RUN npm build

# Use a lightweight web server to serve the static files
#RUN npm install -g serve

RUN npm install -D webpack-cli -y
RUN npm install -D webpack-dev-server -y


CMD ["cd", "./personal-notes", "&&", "npx", "webpack", "serve", "--mode", "development"]

# Expose the port
EXPOSE 3000
