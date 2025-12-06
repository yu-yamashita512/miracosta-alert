const fetch = require('node-fetch');
const appId = '1030644021652765205';
const hotelNo = '74733';
const checkinDate = '2024-12-08';
const params = new URLSearchParams({
  applicationId: appId,
  hotelNo,
  checkinDate,
  stayCount: '1',
});
const endpoint = `https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426?${params.toString()}`;

fetch(endpoint)
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  });
