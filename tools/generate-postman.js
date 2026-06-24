const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  // 1. Get concertId
  const concert = await prisma.concert.findFirst({
    where: { slug: 'anh-trai-say-hi-2026' }
  });
  
  if (!concert) {
    console.error('No concert found. Please run seed first.');
    process.exit(1);
  }

  // 2. Read PDF as base64
  let base64Pdf = '';
  if (fs.existsSync('press-kit.pdf')) {
    const fileBuffer = fs.readFileSync('press-kit.pdf');
    base64Pdf = fileBuffer.toString('base64');
  } else {
    // Generate a dummy PDF base64 if file doesn't exist
    base64Pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF').toString('base64');
  }

  const collection = {
    "info": {
      "name": "TicketBox - AI Artist Bio Test",
      "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
      { "key": "baseUrl", "value": "http://localhost:3000" },
      { "key": "token", "value": "" },
      { "key": "concertId", "value": concert.id },
      { "key": "bioId", "value": "" }
    ],
    "item": [
      {
        "name": "0. Login (Get Token)",
        "event": [
          {
            "listen": "test",
            "script": {
              "exec": [
                "var jsonData = pm.response.json();",
                "pm.collectionVariables.set(\"token\", jsonData.accessToken);"
              ],
              "type": "text/javascript"
            }
          }
        ],
        "request": {
          "method": "POST",
          "header": [
            { "key": "Content-Type", "value": "application/json" }
          ],
          "body": {
            "mode": "raw",
            "raw": "{\"email\":\"organizer@ticketbox.test\",\"password\":\"demoPassword\"}"
          },
          "url": {
            "raw": "{{baseUrl}}/auth/login",
            "host": ["{{baseUrl}}"],
            "path": ["auth", "login"]
          }
        }
      },
      {
        "name": "1. Request Artist Bio (Upload PDF)",
        "event": [
          {
            "listen": "test",
            "script": {
              "exec": [
                "var jsonData = pm.response.json();",
                "pm.collectionVariables.set(\"bioId\", jsonData.id);"
              ],
              "type": "text/javascript"
            }
          }
        ],
        "request": {
          "method": "POST",
          "header": [
            { "key": "Authorization", "value": "Bearer {{token}}" },
            { "key": "Content-Type", "value": "application/json" }
          ],
          "body": {
            "mode": "raw",
            "raw": JSON.stringify({
              "originalName": "press-kit.pdf",
              "contentType": "application/pdf",
              "contentBase64": base64Pdf
            })
          },
          "url": {
            "raw": "{{baseUrl}}/organizer/concerts/{{concertId}}/artist-bio",
            "host": ["{{baseUrl}}"],
            "path": ["organizer", "concerts", "{{concertId}}", "artist-bio"]
          }
        }
      },
      {
        "name": "2. Get Latest Bio (Check Result)",
        "request": {
          "method": "GET",
          "header": [
            { "key": "Authorization", "value": "Bearer {{token}}" }
          ],
          "url": {
            "raw": "{{baseUrl}}/organizer/concerts/{{concertId}}/artist-bio",
            "host": ["{{baseUrl}}"],
            "path": ["organizer", "concerts", "{{concertId}}", "artist-bio"]
          }
        }
      }
    ]
  };

  fs.writeFileSync('TicketBox-AI-Artist-Bio.postman_collection.json', JSON.stringify(collection, null, 2));
  console.log('Successfully generated TicketBox-AI-Artist-Bio.postman_collection.json!');
  await prisma.$disconnect();
}

main().catch(console.error);
