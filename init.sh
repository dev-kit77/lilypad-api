#!/bin/bash
# Lilypad API Initialisation script.
# V1.00
# Kit Cochrane

echo "Checking for bun install..."

#run bun version command and check for output
if ! command -v bun >/dev/null; then
    echo "Bun is not installed! Please install bun before running this script."
    exit 1
else
    echo "Bun is installed!"
    echo -e "\nProceeding with dependencies installation..."
    bun install
fi

echo -e "\nChecking for Environment file..."

#check for .env file
if [ ! -f .env ]; then
    echo ".env file not found! Please create a .env file based on .env-example."
    exit 1
else
    echo ".env file found!"
    echo -e "\nProceeding with environment checks..."
fi

#load variables from file
export $(grep -v '^#' .env | xargs)

#check environment type
#no var set
if [ -z $ENVIROMENT ]; then
    echo "Environment variable ENVIROMENT is not set. Please see .env Environment Variables and .env-example."
    exit 1
elif [ $ENVIROMENT == "PROD" ]; then
    echo "Environment is set for Production."
elif [ $ENVIROMENT == "DEV" ]; then
    echo "Environment is set for Development."
elif [ $ENVIROMENT == "RESET" ]; then
    echo "Environment is set for Reset."

#unknown value
else
    echo "Environment variable ENVIROMENT is set to an unknown value: $ENVIROMENT. Please see .env Environment Variables and .env-example."
    exit 1
fi

#check for database url
if [ -z $DATABASE_URL ]; then
    echo "Database URL is not set. Please see .env Environment Variables and .env-example."
    exit 1
elif [ ${DATABASE_URL::13} != "postgresql://" ]; then
    echo "Database URL: $DATABASE_URL is not a PostgreSQL URL. Please see .env Environment Variables and .env-example."
    exit 1
fi

echo "Database URL is set to $DATABASE_URL"

#check database connection
echo -e "\nChecking database connection at ${DATABASE_URL%?schema=public}..."
pg_isready -d ${DATABASE_URL%?schema=public}

#check exit code
if [ $? != 0 ]; then
    echo "Database connection Error. Please check your PostgreSQL Database & credentials in .env."
else
    #display connection info
    echo "\conninfo" | psql -X -d ${DATABASE_URL%?schema=public} -P pager=off
fi
