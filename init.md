+==============================================================================+
|                   Lilypad API Initialisation script. V1.00                   |
|                                 Kit Cochrane                                 |
| This script initialises an instance of the Lilypad API within the given      |
| environment, set in the .env file. Each enviroment expands the previous.     |
|                                                                              |
| Enviroments:                                                                 |
| 1: PROD - Standard Production environment.                                   |
| 2: DEV - Recomputes all files generated files but keeps data integrity.      |
| 3: INIT - Resets and recomputes the entire API wiping ALL DATA. DANGEROUS!   |
|                                                                              |
| Script Operations:                                                           |
| + Checks for required .env file & variables (PROD)                           |
| + Checks for a bun install (PROD)                                            |
| + Checks Bun dependencies and modules and installs missing (PROD)            |
| + Resets the current database (INIT)                                         |
| + Generates the current Prisma migrations (DEV)                              |
| + Updates any SQL (DEV)                                                      |
| + Generates the prisma client files (DEV)                                    |
| + Compiles any needed files (DEV)                                            |
| + Starts the API Server (PROD)                                               |
+------------------------------------------------------------------------------+
