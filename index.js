const AWS = require('aws-sdk');
const XLSX = require('xlsx');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log("test1")
    const BUCKET_NAME = event.s3_bucketName;
    const FILE_NAME = event.fileName;
    const region = event.region;
    const TABLE_NAME = event.tableName;
    const docClientRegion = new AWS.DynamoDB.DocumentClient({ region });
    let updatedRows = 0;
    let failedRows = 0;

    try {
        const s3Params = {
            Bucket: BUCKET_NAME,
            Key: FILE_NAME
        };
        console.log("params", s3Params);
        // Get the Excel file from S3
        const s3Object = await s3.getObject(s3Params).promise();

        // Parse the Excel file
        const workbook = XLSX.read(s3Object.Body);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Iterate through the rows and update the corresponding item in DynamoDB
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const dateThreshold = new Date('2/2/23');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            console.log("row::", row);
            const functionName = row[0];
            const initialDumpDate = new Date(row[1]);

            if (!functionName || new Date(initialDumpDate) > dateThreshold) {
                console.log('Skipping row:', row);
                failedRows++;
                continue; // Skip if function name is not present or initial dump is after Feb 2nd, 2023
            }

            const updateParams = {
                TableName: TABLE_NAME,
                Key: { function_name: functionName },
                UpdateExpression: 'SET initial_audit_date = :val1',
                ExpressionAttributeValues: {
                    ':val1': row[1] || row[2],
                },
            };
            console.log(`Updating item in region ${region}:`, updateParams);
            let updateItem;
            try {
                updateItem = await docClientRegion.update(updateParams).promise();
                updatedRows++;

            } catch (err) {
                if (err.code === 'ResourceNotFoundException') {
                    console.log(`Item with function_name ${functionName} does not exist in DynamoDB table. Skipping.`);
                    failedRows++;
                    continue;
                } else {
                    console.log(`errorr: ${err} Skipping.`);
                    failedRows++;
                    continue;
                }
            }
            console.log(`Update successful in region ${region}`);
        }

        return {
            statusCode: 200,
            body: `Update successful. ${updatedRows} rows updated, ${failedRows} rows failed.`
        };
    } catch (err) {
        console.error("Errorr catch: ", err);
        return { statusCode: 500, body: 'Error updating DynamoDB table' };
    }
};
