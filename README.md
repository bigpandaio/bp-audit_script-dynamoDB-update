# bp-audit_script-dynamoDB-update

#setup

   `npm install` to install libraries which required for this script.

Procedure:

1. Parsing buket name, file name, table name and region to the event.
2. Fetching excel file from s3, and converting it by using xlsx library.
3. Iterating rows and update the initial dump value to the corresponsing function name.
4. Update if the function name exists and initial dump is before 2nd feb2023 else skip and move on to next.
5.Need to execute this script in to both region(us-east-1 and us-west-2).
6. We will get response with success and failure counts.
