-- Create databases
CREATE DATABASE radris;
CREATE DATABASE orthanc;

-- Create user with proper permissions
CREATE USER radris WITH ENCRYPTED PASSWORD 'radris123';
GRANT ALL PRIVILEGES ON DATABASE radris TO radris;
GRANT ALL PRIVILEGES ON DATABASE orthanc TO radris;

-- Connect to radris database and set up extensions
\c radris;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT ALL ON SCHEMA public TO radris;

-- Connect to orthanc database and set up extensions
\c orthanc;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL ON SCHEMA public TO radris;