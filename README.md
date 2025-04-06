# Unit 5: Programed Solution - NEA

Investigate, design, prototype, implement, test, and evaluate a computer solution to a self-chosen problem with detailed analysis of current data processes & thorough documentation to support peer and teacher discussions.

A full system code listing is available as part of the software development section of my final report

## Current system

Currently the systems have been hosted on <https://solarportal.alexgs.co.uk> with the backend available at <https://solarportal-server.alexgs.co.uk>. This is accessible via the WWW and my setup of the system can be used. They are currently hosted using cloudflare's free sites and serverless worker programs

## Setup

Alternatively in order to setup this as your own system: 
- host the provided worker.js file as an API endpoint and replace all references to <https://solarportal-server.alexgs.co.uk> with your new API endpoint
- replace all references to <https://solarportal.alexgs.co.uk> with the URL of wherever you have hosted your system. 
- In you attached DBMS enter the SQL setup text from the SQL.txt file provided which will initialise your database and set the relationships and also create the initial admin login with default password "admin" with the SQL setup text

Now your system can be fully accessible by going to where you html code has been hosted.
