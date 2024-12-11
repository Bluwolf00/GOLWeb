var nameEle = document.getElementById('playerName');
var countryEle = document.getElementById('playerCountry');
var statusEle = document.getElementById('playerStatus');
var joinedEle = document.getElementById('playerJoin');
var rankEle = document.getElementById('playerRank');
var promoEle = document.getElementById('playerPromotion');
var profileImg = document.getElementById('profileImg');
var rankImg = document.getElementById('rankImg');

var playerName = "";
var playerCountry = "";
var playerStatus = "";
var playerJoin = "";
var playerRank = "";
var playerPromotion = "";
var countryPath = "";
var rankPath = "";

function updateProfile() {
    nameEle.innerText = playerName;
    countryEle.innerText = playerCountry;
    statusEle.innerText = playerStatus;
    joinedEle.innerText = playerJoin;
    rankEle.innerText = playerRank;
    promoEle.innerText = playerPromotion;
    profileImg.src = countryPath;
    rankImg.src = rankPath;
}

function getProfile() {
    var url = window.location.href;
    var id = url.substring(url.lastIndexOf('=') + 1);
    // console.log(id);
    fetch('/memberinfo?name=' + id)
        .then((response) => response.json())
        .then(([data]) => {
            // console.log(data);
            playerName = data.UName;
            playerCountry = data.Country;
            playerStatus = data.status;
            playerRank = data.rankName;
            playerJoin = "";
            playerPromotion = "";
            try {
                if (data.DateOfJoin === null) {
                    playerJoin = 'Unknown';
                } else {
                    playerJoin = getYearsBetween(new Date(data.DateOfJoin), new Date()) + ' Years ' + getMonthsBetween(new Date(data.DateOfJoin), new Date()) + ' Months';
                }

                if (data.DateOfPromo === null) {
                    playerPromotion = playerJoin;
                } else {
                    playerPromotion = getYearsBetween(new Date(data.DateOfPromo), new Date()) + ' Years ' + getMonthsBetween(new Date(data.DateOfPromo), new Date()) + ' Months';
                }
            } catch (error) {
                console.log('No Date of Join or Promotion: %d', error);
            }
            countryPath = 'img/nation/' + data.Country.toLowerCase() + '.png';
            rankPath = data.rankPath;
            updateProfile();
        });
}

function getYearsBetween(date1, date2) {
    var diff = date2.getTime() - date1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getMonthsBetween(date1, date2) {
    var diff = date2.getTime() - date1.getTime();
    var result = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    return result - (getYearsBetween(date1, date2) * 12);
}

getProfile();