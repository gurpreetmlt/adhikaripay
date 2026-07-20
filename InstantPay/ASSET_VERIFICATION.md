# InstantPay — Asset Verification

> Raw InstantPay Identity / Asset Verification API reference. Pages paste hote jaayenge; implement baad mein. Overview: [`OVERVIEW.md`](OVERVIEW.md).

**Provider:** InstantPay (Identity — Asset Verification)
**Status:** 📄 Docs only — not implemented in Adhikari Pay yet
**Last updated:** 2026-07-20

### Shared headers (sab Asset Verification APIs)

| Name | Type | Description | Mandatory | Provided by InstantPay |
|------|------|-------------|-----------|------------------------|
| `X-Ipay-Auth-Code` | String | Auth Code is `"1"` (Fixed) | M | Y |
| `X-Ipay-Client-Id` | String | Unique Client Id | M | Y |
| `X-Ipay-Client-Secret` | String | Unique Client Secret | M | Y |
| `X-Ipay-Endpoint-Ip` | String | End customer IP Address | M | Y |

### Common response envelope

| Parameter | Type | Description |
|-----------|------|-------------|
| `statuscode` | String | InstantPay Status Code |
| `actcode` | String | Action Code |
| `status` | String/Array | Status message |
| `data` | Object/String | Response Data (if present) |
| `timestamp` | String | Response time (`YYYY-MM-DD HH:II:SS`) |
| `ipay_uuid` | String | Request reference number |
| `orderid` | String | Transaction Id (null if not a transaction) |
| `environment` | String | Live / Sandbox |
| `internalCode` | String | Usually null |

---

## Service-wise status

| # | Service | InstantPay endpoint | Status |
|---|---------|---------------------|--------|
| 1 | UAN Verification Plus | `POST /identity/verifyUan` | 📄 Docs captured |
| 2 | Driving License Verification | `POST /identity/verifyDrivingLicense` | 📄 Docs captured |
| 3 | RC Verification (Plus) | `POST /identity/verifyRcPlus` | 📄 Docs captured |

---

## 1. UAN Verification Plus

EPFO UAN verification — personal + employment details (recent/previous employers), pool debit info.

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `https://api.instantpay.in/identity/verifyUan` |
| **OpenAPI operationId** | `epfo-uan-verification` |
| **Summary** | EPFO UAN Verification |

### Request parameters

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| `uanNumber` | String | Mandatory | Customer EPFO UAN Number |
| `latitude` | String | Mandatory | End Customer Latitude |
| `longitude` | String | Mandatory | End Customer Longitude |
| `externalRef` | String | Mandatory | Your Unique Transaction id |
| `consent` | String | Mandatory | Consent accepted by customer (e.g. `"Y"`) |

### Sample request

```bash
curl --location 'https://api.instantpay.in/identity/verifyUan' \
--header 'X-Ipay-Auth-Code: {{authCode}}' \
--header 'X-Ipay-Client-Id: {{clientId}}' \
--header 'X-Ipay-Client-Secret: {{clientSecret}}' \
--header 'X-Ipay-Endpoint-Ip: {{endPointIP}}' \
--header 'Content-Type: application/json' \
--data '{
  "uanNumber": "xxxxxxxxxxxx",
  "consent": "Y",
  "externalRef": "1737352942",
  "latitude": 0.99,
  "longitude": 38
}'
```

```http
POST /identity/verifyUan HTTP/2.1
Host: api.instantpay.in
X-Ipay-Auth-Code: 1
X-Ipay-Client-Id: xxxxxxxxxxxxxxxx
X-Ipay-Client-Secret: xxxxxxxxxxxxxxxx
X-Ipay-Endpoint-Ip: xxxxxxxxxxxxxx
Content-Type: application/json

{
  "uanNumber": "xxxxxxxxxxxx",
  "consent": "Y",
  "latitude": 0.99,
  "longitude": 38,
  "externalRef": "jdnjdi89"
}
```

### Sample success response

```json
{
  "statuscode": "TXN",
  "actcode": null,
  "status": "Transaction Successful",
  "data": {
    "uanDetails": {
      "personal_details": {
        "userGender": "FEMALE",
        "userDob": "03-01-19XX",
        "userFullName": "ANURXXXX",
        "userPhoneNumber": null
      },
      "employment_details": {
        "isEmployed": true,
        "dateOfExitMarked": false,
        "uanList": ["1013090XXXX"],
        "uanCount": 1,
        "recentEmployerData": {
          "memberId": "DSNHP13800300001XXXXX",
          "establishmentId": "DSNHP1380XXXXXX",
          "dateOfExit": null,
          "dateOfJoining": "08-10-2024",
          "establishmentName": "xxxxx INDIA LIMITED",
          "uanNumber": "1013090XXXXX"
        },
        "previousEmployerData": [
          {
            "sequenceNumber": "1",
            "uanNumber": "1013090XXXX",
            "dateOfExit": null,
            "dateOfJoining": "08-10-2XXX",
            "establishmentId": "DSNHP1380XXXXX",
            "establishmentName": "INSTANTPAY  INDIA LIMITED",
            "memberId": "DSNHP13800300001XXXXXX",
            "leaveReason": null,
            "mobile": null,
            "aadhaarVerificationStatus": ""
          }
        ]
      }
    },
    "poolReferenceId": "1250121105046RHRHR",
    "pool": {
      "openingBal": "5.41",
      "mode": "DR",
      "amount": "0.00",
      "closingBal": "5.41"
    }
  },
  "timestamp": "2025-01-21 10:50:46",
  "ipay_uuid": "h0009e04da96-6c83-427b-abba-2ac8ba5c1f3d-vCkbEcbI3JrE",
  "orderid": "1250121105046RHRHR",
  "environment": "LIVE",
  "internalCode": null
}
```

### Response `data` shape (success)

**`data.uanDetails.personal_details`**

| Field | Type | Notes |
|-------|------|-------|
| `userGender` | String | e.g. `FEMALE` |
| `userDob` | String | Masked DOB |
| `userFullName` | String | Masked name |
| `userPhoneNumber` | String \| null | |

**`data.uanDetails.employment_details`**

| Field | Type | Notes |
|-------|------|-------|
| `isEmployed` | Boolean | |
| `dateOfExitMarked` | Boolean | |
| `uanList` | String[] | |
| `uanCount` | Integer | |
| `recentEmployerData` | Object | `memberId`, `establishmentId`, `dateOfExit`, `dateOfJoining`, `establishmentName`, `uanNumber` |
| `previousEmployerData` | Object[] | + `sequenceNumber`, `leaveReason`, `mobile`, `aadhaarVerificationStatus` |

**`data.pool` / billing**

| Field | Type | Notes |
|-------|------|-------|
| `poolReferenceId` | String | Also mirrors `orderid` in sample |
| `pool.openingBal` | String | |
| `pool.mode` | String | e.g. `DR` |
| `pool.amount` | String | |
| `pool.closingBal` | String | |

### OpenAPI notes

- Spec title: `identity` v1.0
- Server: `https://api.instantpay.in/identity`
- Path: `POST /verifyUan`
- `400` response documented as empty object `{}`

---

## 2. Driving License Verification

Authenticate driving licence validity; extract personal info, permissible vehicle types (COV), and RTO-registered user photo.

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `https://api.instantpay.in/identity/verifyDrivingLicense` |
| **OpenAPI operationId** | `identity-verification-driving-license-verification` |
| **Summary** | Driving License Verification |

### Request parameters

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| `drivingLicenseNumber` | String | Mandatory | Driving License Number |
| `dob` | String | Mandatory | DOB linked with DL (`YYYY-MM-DD`) |
| `latitude` | String | Mandatory | End Customer Latitude |
| `longitude` | String | Mandatory | End Customer Longitude |
| `externalRef` | String | Mandatory | Your Unique Transaction id |
| `consent` | String | Mandatory | Consent accepted by customer (e.g. `"Y"`) |

> Note: OpenAPI schema omits `dob` (docs/sample include it) — treat `dob` as mandatory per request params + sample.

### Sample request

```bash
curl --location 'https://api.instantpay.in/identity/verifyDrivingLicense' \
--header 'X-Ipay-Auth-Code: {{authCode}}' \
--header 'X-Ipay-Client-Id: {{clientId}}' \
--header 'X-Ipay-Client-Secret: {{clientSecret}}' \
--header 'X-Ipay-Endpoint-Ip: {{endPointIP}}' \
--header 'Content-Type: application/json' \
--data '{
  "drivingLicenseNumber": "MH09123456xxx",
  "dob": "2000-12-01",
  "consent": "Y",
  "latitude": 0.99,
  "longitude": 38,
  "externalRef": "jdnjdi89"
}'
```

```http
POST /identity/verifyDrivingLicense HTTP/2.1
Host: api.instantpay.in
X-Ipay-Auth-Code: 1
X-Ipay-Client-Id: xxxxxxxxxxxxxxxx
X-Ipay-Client-Secret: xxxxxxxxxxxxxxxx
X-Ipay-Endpoint-Ip: xxxxxxxxxxxxxx
Content-Type: application/json

{
  "drivingLicenseNumber": "xxxxxxxxxxxx",
  "dob": "xxxx-xx-xx",
  "consent": "Y",
  "latitude": 0.99,
  "longitude": 38,
  "externalRef": "jdnjdi89"
}
```

### Sample success response

```json
{
  "statuscode": "TXN",
  "actcode": null,
  "status": "Transaction Successful",
  "data": {
    "drivingLicenseDetail": {
      "userAddress": [
        {
          "addressLine1": "Sample Address",
          "completeAddress": "Full Address",
          "country": "INDIA",
          "district": "TAL-PANHALA,",
          "pin": "",
          "state": "Maharashtra",
          "type": "Permanent"
        },
        {
          "addressLine1": "Sample Address,",
          "completeAddress": "Full Address",
          "country": "INDIA",
          "district": "TAL-PANHALA,",
          "pin": "",
          "state": "Maharashtra",
          "type": "Present"
        }
      ],
      "userBloodGroup": "U",
      "dlNumber": "MH09 123456789",
      "userDob": "07/05/2000",
      "endorseDate": "",
      "endorseNumber": "",
      "expiryDate": "28/02/2020",
      "fatherOrHusband": "Sample Name",
      "issuedDate": "29/02/2000",
      "nonTransportValidity": { "from": "29/02/2000", "to": "28/02/2020" },
      "state": "Maharashtra",
      "status": "Active",
      "statusDetails": { "from": "", "remarks": "", "to": "" },
      "transportValidity": { "from": "", "to": "" },
      "userFullName": "Sample Name",
      "userImage": "/9j/4AAQhAMVm9O1yXvI4ZgJVLbDIDyD/MVoweDyD2Q==",
      "vehicleCategoryDetails": [
        { "cov": "MCWG", "expiryDate": "", "issueDate": "" },
        { "cov": "LMV", "expiryDate": "", "issueDate": "" }
      ]
    },
    "pool": {
      "referenceId": "1231005102115NHXPE",
      "openingBalance": "47.77",
      "paymentAmount": "0.00",
      "mode": "DR",
      "closingBalance": "47.77"
    }
  },
  "timestamp": "2023-10-05 10:21:15",
  "ipay_uuid": "h0059a4b4991-b430-4411-80fe-f5c24af38c84-jPAvyqyJmw4H",
  "orderid": "1231005102115NHXPE",
  "environment": "LIVE",
  "internalCode": null
}
```

### Response `data` shape (success)

**`data.drivingLicenseDetail`**

| Field | Type | Notes |
|-------|------|-------|
| `userAddress` | Object[] | `addressLine1`, `completeAddress`, `country`, `district`, `pin`, `state`, `type` (`Permanent` / `Present`) |
| `userBloodGroup` | String | |
| `dlNumber` | String | |
| `userDob` | String | Response format often `DD/MM/YYYY` |
| `endorseDate` / `endorseNumber` | String | |
| `expiryDate` | String | |
| `fatherOrHusband` | String | |
| `issuedDate` | String | |
| `nonTransportValidity` | Object | `from`, `to` |
| `transportValidity` | Object | `from`, `to` |
| `state` | String | |
| `status` | String | e.g. `Active` |
| `statusDetails` | Object | `from`, `remarks`, `to` |
| `userFullName` | String | |
| `userImage` | String | Base64 (RTO photo) |
| `vehicleCategoryDetails` | Object[] | `cov` (e.g. `MCWG`, `LMV`), `expiryDate`, `issueDate` |

**`data.pool` / billing**

| Field | Type | Notes |
|-------|------|-------|
| `referenceId` | String | Mirrors `orderid` in sample |
| `openingBalance` | String | |
| `paymentAmount` | String | |
| `mode` | String | e.g. `DR` |
| `closingBalance` | String | |

> Pool field names differ from UAN Plus (`openingBalance` / `paymentAmount` / `closingBalance` vs `openingBal` / `amount` / `closingBal`).

### OpenAPI notes

- Spec title: `identity` v1.0
- Server: `https://api.instantpay.in/identity`
- Path: `POST /verifyDrivingLicense`
- `400` response documented as empty object `{}`

---

## 3. RC Verification (Plus)

Authenticate vehicle Registration Certificate details and enrich with insurance, fitness, permit, PUCC, finance, and owner data. InstantPay titles this **RC Verification Plus**.

| | |
|--|--|
| **Method** | `POST` |
| **URL** | `https://api.instantpay.in/identity/verifyRcPlus` |
| **OpenAPI operationId** | `identity-verification-rc-verification-plus` |
| **Summary** | RC Verification Plus |

### Request parameters

| Parameter | Type | Requirement | Description |
|-----------|------|-------------|-------------|
| `vehicleRegistrationNumber` | String | Mandatory | Vehicle Registration Number |
| `latitude` | String | Mandatory | End Customer Latitude |
| `longitude` | String | Mandatory | End Customer Longitude |
| `externalRef` | String | Mandatory | Your Unique Transaction id |
| `consent` | String | Mandatory | Consent accepted by customer (e.g. `"Y"`) |

### Sample request

```bash
curl --location 'https://api.instantpay.in/identity/verifyRcPlus' \
--header 'X-Ipay-Auth-Code: {{authCode}}' \
--header 'X-Ipay-Client-Id: {{clientId}}' \
--header 'X-Ipay-Client-Secret: {{clientSecret}}' \
--header 'X-Ipay-Endpoint-Ip: {{endPointIP}}' \
--header 'Content-Type: application/json' \
--data '{
  "vehicleRegistrationNumber": "UP85BX1xxx",
  "consent": "Y",
  "latitude": 0.99,
  "longitude": 38,
  "externalRef": "jdnjdi89"
}'
```

```http
POST /identity/verifyRcPlus HTTP/1.1
Host: api.instantpay.in
X-Ipay-Auth-Code: 1
X-Ipay-Client-Id: xxxxxxxxxxxxxxxx
X-Ipay-Client-Secret: xxxxxxxxxxxxxxxx
X-Ipay-Endpoint-Ip: xxxxxxxxxxxxxx
Content-Type: application/json

{
  "vehicleRegistrationNumber": "UP81AB1234",
  "consent": "Y",
  "latitude": 0.99,
  "longitude": 38,
  "externalRef": "jdnjdi89"
}
```

### Sample success response

> Provider sample JSON appears truncated/malformed (envelope fields nested under `data`, missing closing braces). Shape below follows the pasted payload; treat top-level envelope as standard InstantPay response when implementing.

```json
{
  "statuscode": "TXN",
  "actcode": null,
  "status": "Transaction Successful",
  "data": {
    "vehicalData": {
      "rcBlacklistStatus": "NA",
      "bodyTypeDescription": "2WHEELER",
      "rcChassisNumber": "MD626B******C40204",
      "fatherName": "Sample Name",
      "financer": "NA",
      "insurance": {
        "company": "Acko General Insurance Limited",
        "expiryDate": "26/05/2024",
        "policyNumber": "DBCR00******044/00"
      },
      "nationalPermitExpiryDate": "NA",
      "nationalPermitIssuedBy": "NA",
      "nationalPermitNumber": "NA",
      "normsDescription": "BHARAT STAGE III",
      "vehicleOwnerNumber": "2",
      "userPermanentAddress": "Address",
      "rcEngineNumber": "BG4*****675",
      "rcExpiryDate": "03/06/2031",
      "rcFitUpto": "03/06/2031",
      "rcNocDetails": "NA",
      "rcPermitExpiryDate": "NA",
      "rcPermitIssuedDate": "NA",
      "rcPermitNumber": "NA",
      "rcPermitStartDate": "NA",
      "rcPermitType": "NA",
      "rcPuccExpiryDate": "17/03/2024",
      "rcPuccNo": "UP01*****100",
      "rcRegistrationDate": "26/05/2016",
      "rcRegistrationLocation": "SOUTH DELHI, Delhi",
      "rcRegistrationNumber": "DL3SDE8521",
      "rcStateCode": "DL",
      "rcStatus": "ACTIVE",
      "rcStatusAsOn": "05/10/2023",
      "rcTaxUpto": "LTT",
      "rcSource": "P",
      "userName": "Sample name",
      "userPresentAddress": " Address",
      "vehicleCategory": "2WN",
      "vehicleClassDescription": "M-Cycle/Scooter(2WN)",
      "vehicleColor": "TITANIUM GREY",
      "vehicleCubicCapacity": "109.7",
      "vehicleFuelDescription": "PETROL",
      "vehicleGrossWeight": "238",
      "vehicleMakeModel": "TVS JUPITER",
      "vehicleMakerDescription": "TVS MOTOR COMPANY LTD",
      "vehicleManufacturedDate": "03/2016",
      "vehicleNumberOfCylinders": "1",
      "vehicleSeatingCapacity": "2",
      "vehicleSleeperCapacity": "NA",
      "vehicleStandCapacity": "NA",
      "vehicleUnladenWeight": "108",
      "vehicleWheelbase": "1275",
      "vehicleType": "2W",
      "rcCommercialStatus": "NO",
      "rcRtoCode": "DL-3",
      "vehicleFinanced": "NA",
      "monthYearRemainingForInsuranceExp": "NA",
      "insuranceExpired": "N",
      "vehicleFitnessExpired": "N",
      "vehicleAge": "7 years 4 months",
      "city": "South Delhi",
      "state": "DELHI",
      "invoiceInfo": {
        "purchaseDate": "NA",
        "purchaseAmount": "NA",
        "dealerName": "NA",
        "dealerAddress": "NA"
      }
    }
  },
  "timestamp": "2022-02-16 15:56:47",
  "ipay_uuid": "h006959ccf00-ce00-43e6-9583-ebc118a77f82",
  "orderid": "1220**********JSKY",
  "environment": "LIVE",
  "internalCode": null
}
```

### Response `data` shape (success)

> Key is spelled **`vehicalData`** (provider typo) — keep as-is when parsing.

**`data.vehicalData` — registration / status**

| Field | Notes |
|-------|-------|
| `rcRegistrationNumber`, `rcStateCode`, `rcRtoCode`, `rcRegistrationDate`, `rcRegistrationLocation` | RC identity |
| `rcStatus`, `rcStatusAsOn`, `rcSource`, `rcBlacklistStatus`, `rcCommercialStatus` | Status |
| `rcExpiryDate`, `rcFitUpto`, `rcTaxUpto`, `rcNocDetails` | Validity / tax |
| `rcChassisNumber`, `rcEngineNumber` | Often masked |

**Owner / address**

| Field | Notes |
|-------|-------|
| `userName`, `fatherName`, `vehicleOwnerNumber` | |
| `userPermanentAddress`, `userPresentAddress`, `city`, `state` | |

**Vehicle specs**

| Field | Notes |
|-------|-------|
| `vehicleType`, `vehicleCategory`, `vehicleClassDescription`, `bodyTypeDescription` | e.g. `2W`, `2WN` |
| `vehicleMakeModel`, `vehicleMakerDescription`, `vehicleColor`, `vehicleFuelDescription` | |
| `vehicleCubicCapacity`, `vehicleGrossWeight`, `vehicleUnladenWeight`, `vehicleWheelbase` | |
| `vehicleNumberOfCylinders`, `vehicleSeatingCapacity`, `vehicleSleeperCapacity`, `vehicleStandCapacity` | |
| `vehicleManufacturedDate`, `vehicleAge`, `normsDescription` | |

**Insurance / finance / permits / PUCC**

| Field | Notes |
|-------|-------|
| `insurance.company`, `insurance.expiryDate`, `insurance.policyNumber` | |
| `insuranceExpired`, `monthYearRemainingForInsuranceExp` | |
| `financer`, `vehicleFinanced` | |
| `rcPuccNo`, `rcPuccExpiryDate` | |
| `rcPermit*`, `nationalPermit*` | Often `"NA"` for non-commercial |
| `vehicleFitnessExpired` | `Y` / `N` |
| `invoiceInfo` | `purchaseDate`, `purchaseAmount`, `dealerName`, `dealerAddress` |

### OpenAPI notes

- Spec title: `identity` v1.0
- Server: `https://api.instantpay.in/identity`
- Path: `POST /verifyRcPlus`
- `400` response documented as empty object `{}`
- OpenAPI property description for `vehicleRegistrationNumber` incorrectly says `udyamNumber` (copy-paste error in provider docs)
