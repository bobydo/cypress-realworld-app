# Cypress Improvements Over Time

## Save test results to cloud
npx cypress run --component --record --key <key>
![alt text](image.png)

## Changed package.json and kill existing process in case you close terminal accidental
"predev": "npx kill-port 3000 3001 3002 3003 && yarn db:seed:dev",


