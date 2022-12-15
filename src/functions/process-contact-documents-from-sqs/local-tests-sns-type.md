# How to test locally

Example command:

```
serverless invoke local --function processContactDocumentFromSQS --data '{"Records":[
    {
      "EventVersion": "1.0",
      "EventSubscriptionArn": "arn:aws:sns:us-east-2:123456789012:sns-lambda:21be56ed-a058-49f5-8c98-aedd2564c486",
      "EventSource": "aws:sns",
      "Sns": {
        "SignatureVersion": "1",
        "Timestamp": "2019-01-02T12:45:07.000Z",
        "Signature": "tcc6faL2yUC6dgZdmrwh1Y4cGa/ebXEkAi6RibDsvpi+tE/1+82j...65r==",
        "SigningCertUrl": "https://sns.us-east-2.amazonaws.com/SimpleNotificationService-ac565b8b1a6c5d002d285f9598aa1d9b.pem",
        "MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
        "Message": {"name":"A-Luokka Alamäki Eeva-Kaisa","title":"erityisluokanopettaja","title_sv":"specialklasslärare","title_en":"special class teacher","email_address":"eeva-kaisa.alamaki@edu.hel.fi","phones":{"phone":{"#text":"0931086028","@_type":"landline"}},"addresses":{"address":"Mikkolankuja 6 E Hki 68"},"ous":{"ou":[{"#text":"Kasvatuksen ja koulutuksen toimiala","@_level":0},{"#text":"Perusopetus","@_level":1},{"#text":"Perusopetuksen alueelliset palvelut","@_level":2},{"#text":"Alue 4, pohjoinen suurpiiri","@_level":3},{"#text":"Solakallion koulu","@_level":4}]},"search_words":{"search_word":[{"type":"ou","weight":35,"word":"kasvatuksen"},{"type":"ou","weight":35,"word":"koulutuksen"},{"type":"ou","weight":35,"word":"toimiala"},{"type":"ou","weight":35,"word":"perusopetus"},{"type":"ou","weight":35,"word":"perusopetuksen"},{"type":"ou","weight":35,"word":"alueelliset"},{"type":"ou","weight":35,"word":"palvelut"},{"type":"ou","weight":35,"word":"alue"},{"type":"ou","weight":35,"word":"pohjoinen"},{"type":"ou","weight":35,"word":"suurpiiri"},{"type":"ou","weight":35,"word":"solakallion"},{"type":"ou","weight":35,"word":"koulu"},{"type":"title","weight":62,"word":"erityisluokanopettaja"},{"type":"title","weight":62,"word":"specialklasslärare"},{"type":"title","weight":62,"word":"special"},{"type":"title","weight":62,"word":"class"},{"type":"title","weight":62,"word":"teacher"},{"type":"name","weight":85,"word":"a-luokka"},{"type":"name","weight":84,"word":"alamäki"},{"type":"name","weight":84,"word":"eeva-kaisa"}]},"@_mecm_id":383574},
        "MessageAttributes": {
          "Test": {
            "Type": "String",
            "Value": "TestString"
          },
          "TestBinary": {
            "Type": "Binary",
            "Value": "TestBinary"
          }
        },
        "Type": "Notification",
        "UnsubscribeUrl": "https://sns.us-east-2.amazonaws.com/?Action=Unsubscribe&amp;SubscriptionArn=arn:aws:sns:us-east-2:123456789012:test-lambda:21be56ed-a058-49f5-8c98-aedd2564c486",
        "TopicArn":"arn:aws:sns:us-east-2:123456789012:sns-lambda",
        "Subject": "TestInvoke"
      }
    }
  ]
}' --stage sta
```

NOTE: This information is publicly available from: [https://numerot.hel.fi/export/numerot.hel.fi.xml]()


