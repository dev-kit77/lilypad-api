#!/bin/bash
# Lilypad API Initialisation script.
# V1.00
# Kit Cochrane

#import basic functions lib
source ./lib/basics.sh

#init skip counter
SKIP=0

#print script info
cat ./init.md

#check for .env file
message "Checking for Environment file..."
if [ ! -f .env ]; then
    throw 3 ".env file not found! Please create a .env file following .env-example schem."
else
    success ".env file found!"
    message "Proceeding with environment checks..."
fi

#load variables from file
message "Extracting environment variables from .env..."
export $(grep -v '^#' .env | xargs)

#verify environment variables loaded successfully
exit_check "Failed to load environment variables from .env file." "Values extracted from .env!"

#check environment type
#no var set
if [ -z $ENVIROMENT ]; then
    throw 4 "Environment variable ENVIROMENT is not set. Please see .env Environment Variables and .env-example schema."
elif [ "$ENVIROMENT" = "PROD" ]; then
    message "Environment is set to Production."
elif [ "$ENVIROMENT" = "DEV" ]; then
    message "Environment is set to Development."
    warn "This environment is intended for development. This can result in unsafe data handling from exposed data and increased startup times!"
elif [ "$ENVIROMENT" = "INIT" ]; then
    message "Environment is set to Initialization."
    warn "This enviroment does not follow data preservation principles. Any data not backed up WILL BE LOST!"
#unknown value
else
    throw 5 "Environment variable ENVIROMENT is set to an unknown value: $ENVIROMENT. Please see .env Environment Variables and .env-example."
fi

#check for database url
if [ -z $DATABASE_URL ]; then
    throw 6 "Database URL is not set. Please see .env Environment Variables and .env-example."
elif [ ${DATABASE_URL::13} != "postgresql://" ]; then
    throw 7 "Database URL: $DATABASE_URL is not a PostgreSQL URL. Please see .env Environment Variables and .env-example."
fi

#notify user
message "Database URL is set to $DATABASE_URL"

#check for pg_isready and psql commands
if [ "$ENVIROMENT" != "DEV" ]; then
    check_install pg_isready
    check_install psql

    #mark as okay
    CONNECTION="OK"
    CLIENT="OK"
else
    #determine status
    if ! check_install pg_isready -w; then
        CONNECTION="UNKNOWN"
    else
        CONNECTION="OK"
    fi

    #determine client status
    if ! check_install psql -w; then
        CLIENT="UNKNOWN"
    else
        CLIENT="OK"
    fi
fi

#check if only client is available
if [ "$CONNECTION" = "UNKNOWN" ] && [ "$CLIENT" = "OK" ]; then
    warn "Unable to verify database connection at ${DATABASE_URL%?schema=public}. Proceeding with unverified connection..."
elif [ "$CONNECTION" = "OK" ]; then
    #check database connection
    message "Checking database connection at ${DATABASE_URL%?schema=public}..."
    echo -en "\033[0mDATABASE: "
    pg_isready -d ${DATABASE_URL%?schema=public}

    #verify
    exit_check "Database connection Error. Please check your PostgreSQL connection string & credentials in .env." "Connected to database: ${DATABASE_URL%?schema=public}!"
fi

#check if available
if [ "$CLIENT" = "OK" ]; then
    #add default connection info query
    queries="\conninfo"

    #check for INIT environment
    if [ "$ENVIROMENT" = "INIT" ]; then
        #Confirm with user
        warn_prompt "Are you sure you want to reset database schema? ALL DATA WILL BE LOST! (y/n): "
        read -n 1
        newl

        #read reply
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            #reset schema SQL Queries
            queries+="\\\ DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO pg_database_owner, public;
            COMMENT ON SCHEMA public IS 'standard public schema';"
        else
            throw 8 "Reset cancelled. No data has been modified."
        fi
    fi

    #Execute queries
    message "Executing queries..."
    echo $queries | psql -X -d ${DATABASE_URL%?schema=public} -P pager=off

    #verify
    exit_check "Database connection Error. Please check your PostgreSQL connection string & credentials in .env." "Queries on database executed successfully"
fi

#check for bun installation
check_install bun

#install dependencies
message "Proceeding with dependencies installation..."
#check enviroment
if [ "$ENVIROMENT" = "INIT" ]; then
    bun install --force --verbose
elif [ "$ENVIROMENT" = "DEV" ]; then
    bun install --verbose
else
    bun install --production
fi

#verify
exit_check "Dependencies installation failed" "Dependencies installed!"

if [ "$ENVIROMENT" != "PROD" ]; then
    if [ "$ENVIROMENT" = "INIT" ]; then
        #remove any previous migrations
        message "Removing any previous migrations..."
        remove "./prisma/migrations/*/"

        #verify
        exit_check "Unable to delete migrations" "Migrations removed!"

        #remove any previous prisma client
        message "Removing any previous prisma client..."
        remove ./generated/prisma

        #verify
        exit_check "Unable to delete prisma client" "Prisma client removed!"
    fi

    #generate migrations
    message "Generating prisma migrations..."
    bunx --bun prisma migrate dev --name init --create-only

    #verify
    exit_check "Encountered error generating prisma migrations." "Migrations generated!"

    #modify prisma migrations
    message "Modifying migrations..."
    #needed SQL modification operations (e.g. adding Postgres plugins) go here after this statement
    success "Migrations Updated"

    #execute migrations on database
    message "Executing Prisma migrations on Database..."
    bunx --bun prisma migrate dev

    #verify
    exit_check "Encountered error applying migrations. Please check database integrity." "Migrations applied to database!"

    #generate prisma client
    message "Generating prisma client..."
    bunx --bun prisma generate

    #verify
    exit_check "Encountered error generating prisma client." "Client successfully generated!"

    #build api
    message "Building Lilypad-API..."
    #any build commands go here

    #verify
    #exit_check "Encountered error building API." "API built!"
fi

#start api
message "Starting Lilypad-API..."
bun run ./src/index.ts #this bun command will need updated later on to a proper script in package.json

#verify
exit_check "Encountered error starting API." "API running!"

#end script
clean_exit 0
